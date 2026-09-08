# Apple In-App Purchase — implementation handover

Date: 2026-08-29
Spec: `bombay-canvas-be/docs/superpowers/specs/2026-08-29-apple-iap-design.md`
Branches: `bombay-canvas-be @ feat/apple-iap`, `bombay-canvas-app @ feat/apple-iap-impl`
State: all code is in the working tree. **Nothing is committed.**

---

## 1. What this is

Apple In-App Purchase has been added as a **second payment rail** next to Razorpay, because Apple guideline 3.1.1 requires a digital subscription bought on iOS to go through IAP. We did not migrate anything: Razorpay stays the rail for Android and web, and existing iOS Razorpay payers are grandfathered until their window lapses.

The backend remains the single source of truth for entitlement. Razorpay and Apple are two doors into the same room — each reports "this person paid", the server flips the same `Subscription` row, and `syncUserCache` mirrors it onto `User.subscriptionStatus` / `User.subscriptionValidUntil`.

**Nothing downstream of `syncUserCache` learns that Apple exists.** Every entitlement check, paywall gate, player gate and content lock is byte-identical to before. `subscription.transitions.ts` (`computeNextState`) is reused verbatim by the Apple path; `applyLifecycleEvent` and the rest of the Razorpay lifecycle code were not touched.

---

## 2. Architecture

```mermaid
flowchart TD
    subgraph razorpay["Razorpay rail — Android and web"]
        RZP_APP["App: Razorpay checkout"]
        RZP_WH["POST /subscription/webhook<br/>HMAC verified"]
        RZP_LIFE["applyLifecycleEvent<br/>UNCHANGED"]
    end

    subgraph apple["Apple rail — iOS"]
        SK["StoreKit 2 via react-native-iap"]
        VERIFY["POST /subscription/apple/verify"]
        LINK["POST /subscription/apple/link<br/>restore and orphan claim"]
        APPLE_WH["POST /subscription/apple/webhook<br/>JWS verified"]
        APPLE_LIFE["applyAppleLifecycleEvent"]
    end

    RZP_APP --> RZP_WH --> RZP_LIFE
    SK --> VERIFY --> APPLE_LIFE
    SK --> LINK --> APPLE_LIFE
    APPLE_WH --> APPLE_LIFE

    RZP_LIFE --> TRANS["computeNextState<br/>subscription.transitions.ts<br/>SHARED, REUSED VERBATIM"]
    APPLE_LIFE --> TRANS

    TRANS --> SUB[("Subscription row<br/>provider = RAZORPAY or APPLE")]
    SUB --> SYNC["syncUserCache<br/>SOLE writer of the entitlement mirror"]
    SYNC --> USER[("User.subscriptionStatus<br/>User.subscriptionValidUntil")]
    USER --> GATES["Content gates, player gate,<br/>paywall gate — ALL UNCHANGED"]

    CRON1["Cron: reconcileSubscriptions<br/>RAZORPAY rows only"] --> RZP_LIFE
    CRON2["Cron: reconcileAppleSubscriptions<br/>APPLE rows only, every 15 min"] --> APPLE_LIFE
```

The two reconcile crons were explicitly partitioned. `reconcileSubscriptions` now leads its where-clause with `provider: RAZORPAY`, and `reconcileSubscription` (the admin endpoint) throws `APPLE_RECONCILE_NOT_SUPPORTED` for an Apple row. Without that partition the two crons would fight over the same table and every Apple row would land in the Razorpay sweep's failure count every fifteen minutes.

---

## 3. The purchase flow

The ordering here is load-bearing. `finishTransaction` happens **last**, after the server has granted.

```mermaid
sequenceDiagram
    participant U as User
    participant App as App - appleIap.ts
    participant SK as StoreKit / App Store
    participant BE as Backend
    participant AV as appleVerify.ts
    participant DB as Postgres

    App->>SK: 1. initConnection()
    App->>App: 2. registerListeners() BEFORE any purchase
    App->>SK: 3. fetchProducts({ skus, type: 'subs' })
    Note over App,SK: warms the native productTypeBySku map,<br/>otherwise type 'subs' is silently discarded

    U->>App: taps Subscribe
    App->>SK: 4. requestPurchase({ apple: { sku, appAccountToken }, type: 'subs' })
    Note over App: requestPurchase is EVENT-based.<br/>It never resolves with the purchase.

    SK-->>U: payment sheet, Face ID
    SK->>App: 5. purchaseUpdatedListener(purchase)

    App->>BE: 6. POST /apple/verify { signedTransaction }
    BE->>AV: verifyAndDecodeTransaction(JWS)
    AV->>AV: chain to Apple root CA, check bundleId + environment
    AV-->>BE: DecodedAppleTransaction (or throw 400)

    BE->>DB: applyAppleLifecycleEvent -> computeNextState
    BE->>DB: syncUserCache(userId)
    BE-->>App: 200 { subscriptionId, status, subscription }

    App->>App: invalidateEntitlementQueries()
    App->>SK: 7. finishTransaction({ purchase, isConsumable: false })
    Note over App,SK: LAST. If verify failed we deliberately do NOT finish —<br/>StoreKit replays the unfinished transaction on next launch,<br/>which is the only thing between a failed verify and<br/>a user who paid but has no entitlement.
```

The corresponding code path, `grantAndFinish` in `src/services/iap/appleIap.ts`, treats a `finishTransaction` failure _after_ a successful verify as queue hygiene rather than a payment failure: the grant already landed, the next launch replays, and the server verify is idempotent.

---

## 4. The renewal / webhook flow

App Store Server Notifications V2. No shared secret, no header HMAC — authenticity comes from the JWS signature alone, so the global `express.json()` mount is sufficient (unlike the Razorpay webhook's raw-body requirement).

```mermaid
sequenceDiagram
    participant AS as App Store
    participant WH as appleWebhook.controller
    participant AV as appleVerify.ts
    participant MAP as appleNotifications.ts
    participant SVC as appleSubscription.service
    participant DB as Postgres

    AS->>WH: POST /apple/webhook { signedPayload }

    WH->>AV: verifyAndDecodeAppleNotification(signedPayload)
    alt signature or chain invalid
        AV-->>WH: throw
        WH-->>AS: 400 — nothing written
    end
    AV-->>WH: DecodedAppleNotification

    WH->>DB: WebhookEvent.create({ provider 'apple', eventId: notificationUUID })
    alt duplicate P2002 and prior row SETTLED
        WH-->>AS: 200 no-op
    else prior row unsettled or failed
        Note over WH: re-dispatch — applyAppleLifecycleEvent is idempotent
    end

    WH->>MAP: mapAppleNotificationToEffect({ type, subtype, isTrialPeriod })
    MAP-->>WH: effect { kind, status, cancelAtPeriodEnd, cutWindowToNow }

    alt effect.kind == 'noop' or TEST or unknown type or FAMILY_SHARED
        WH->>DB: finalize('ignored')
        WH-->>AS: 200 — stop retrying, we cannot act on it
    end

    WH->>SVC: resolveUserForAppleTransaction(facts)

    alt user resolved via appAccountToken, an existing Subscription, or a claimed orphan
        SVC->>DB: applyAppleLifecycleEvent -> computeNextState -> syncUserCache
        WH->>DB: finalize('processed')
        WH-->>AS: 200
    else NO resolvable user — ORPHAN branch
        SVC->>DB: AppleUnlinkedTransaction.upsert({ originalTransactionId, signedPayload, ... })
        Note over SVC,DB: the raw JWS is stored so it can be REPLAYED<br/>through the same verify path when a user claims it
        WH->>DB: finalize('ignored')
        WH-->>AS: 200
    end

    alt genuine processing failure
        WH->>DB: finalize('failed')
        WH-->>AS: 500 — Apple retries for up to 3 days
    end
```

The status codes are the contract with Apple's retry machine: any 2xx stops redelivery, a non-2xx is retried for up to three days. An unmappable notification therefore settles as an audited 200 — retrying it forever cannot make it mappable.

### Notification mapping (spec §7.1, implemented verbatim in `appleNotifications.ts`)

| Apple type (subtype)                                                    | Effect                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| `SUBSCRIBED` (`INITIAL_BUY` / `RESUBSCRIBE`)                            | `ACTIVE`, or `TRIAL` when `offerType === 1`                  |
| `DID_RENEW`                                                             | `ACTIVE`                                                     |
| `DID_FAIL_TO_RENEW` (`GRACE_PERIOD`)                                    | `PENDING` — still access-granting                            |
| `DID_FAIL_TO_RENEW` (no subtype)                                        | `HALTED`                                                     |
| `EXPIRED`                                                               | `EXPIRED`                                                    |
| `DID_CHANGE_RENEWAL_STATUS` (`AUTO_RENEW_DISABLED`)                     | `cancelAtPeriodEnd = true`, status unchanged                 |
| `DID_CHANGE_RENEWAL_STATUS` (`AUTO_RENEW_ENABLED`)                      | `cancelAtPeriodEnd = false`                                  |
| `DID_CHANGE_RENEWAL_PREF`                                               | plan change on next renewal                                  |
| `REFUND`, `REVOKE`                                                      | `CANCELLED` **and the window is cut to the revocation date** |
| `PRICE_INCREASE`, `CONSUMPTION_REQUEST`, `GRACE_PERIOD_EXPIRED`, `TEST` | log + ack, no state change                                   |
| anything else                                                           | `noop` — acked, never guessed at                             |

`REFUND` / `REVOKE` is the one and only place the never-shrinks-a-window rule is broken, and it is done outside `computeNextState` on purpose, because `nextPeriod` is monotonic by design.

---

## 5. The orphan / Streamlined Purchasing problem

### Why it exists

Streamlined Purchasing is **ON** for this app and Apple will not let us turn it off. The setting can only be disabled once an approved binary has shipped that uses the StoreKit APIs — which is a chicken-and-egg we cannot break before the first submission.

With it on, a user can buy the subscription **from outside the app** — the App Store product page. Such a transaction carries **no `appAccountToken`**, because there was no app running to mint one and attach it. The webhook receives a perfectly valid, verified, paid subscription that it cannot map to any Canvas account.

Dropping it would mean taking the money and granting nothing. So orphan handling is mandatory, not a nicety. It is also the same path that serves reinstalls, "I switched phones", and offer-code redemptions, so it is load-bearing regardless of Streamlined Purchasing.

### How it resolves

```mermaid
flowchart TD
    BUY["User buys from the App Store product page<br/>(Streamlined Purchasing — no appAccountToken)"]
    BUY --> WH["Webhook: verified JWS, no resolvable user"]
    WH --> STORE[("AppleUnlinkedTransaction<br/>originalTransactionId, productId,<br/>environment, expiresDate,<br/>signedPayload = the raw JWS,<br/>claimedAt = null")]

    LAUNCH["App launch / login<br/>useAppleIapSync"] --> AUTH{"signed in?"}
    AUTH -- no --> WAIT["wait — connection stays open,<br/>listeners installed"]
    AUTH -- yes --> RESTORE["getAvailablePurchases()<br/>every JWS the App Store still holds<br/>for THIS Apple ID"]
    RESTORE --> LINKCALL["POST /apple/link { signedTransactions }"]

    LINKCALL --> VERIFY2["appleVerify: verify each JWS"]
    VERIFY2 --> GRANT["grant entitlement to the signed-in user<br/>applyAppleLifecycleEvent -> syncUserCache"]
    GRANT --> CLAIM["claimUnlinkedAppleTransactions<br/>stamp claimedAt + claimedByUserId"]
    CLAIM --> STORE

    STORE -.->|"future notifications for this<br/>originalTransactionId now resolve<br/>via the Subscription row"| WH

    BTN["Visible 'Restore Purchases' button<br/>(App Store requires one)"] --> RESTORE
```

Two things drive the claim, and both are needed:

1. **Silent, on launch and on every login** — `useAppleIapSync` in `App.tsx`. This is the one that actually catches Streamlined Purchasing orphans, because the user does not know anything needs restoring.
2. **The visible "Restore Purchases" button** — `RestorePurchasesButton.tsx`, rendered under the plans. App Review requires a visible restore control for a submission to pass.

`claimUnlinkedAppleTransactions` guards on `claimedAt: null`, so a re-run reports 0 rather than re-stamping someone else's claim. `recordUnlinkedAppleTransaction` upserts and deliberately omits `claimedAt` from its `update` block, so a post-claim notification cannot un-claim an orphan a user already owns.

---

## 6. Data model changes

### The Prisma diff

```prisma
enum SubscriptionProvider {   // NEW
  RAZORPAY
  APPLE
}

model Plan {
  razorpayPlanId String? @unique   // was REQUIRED — relaxed to nullable
  appleProductId String? @unique   // NEW
}

model Subscription {
  provider                   SubscriptionProvider @default(RAZORPAY)  // NEW
  razorpaySubscriptionId     String? @unique   // was REQUIRED — relaxed to nullable
  appleOriginalTransactionId String? @unique   // NEW
  appleLatestTransactionId   String?           // NEW
  appleProductId             String?           // NEW
  appleEnvironment           String?           // NEW

  @@index([provider, currentPeriodEnd])        // NEW
}

model User {
  appleAppAccountToken String? @unique @db.Uuid   // NEW
}

model AppleUnlinkedTransaction {   // NEW table, no relations
  id                      String    @id @default(cuid())
  originalTransactionId   String    @unique
  latestTransactionId     String?
  productId               String
  environment             String
  expiresDate             DateTime?
  lastNotificationType    String?
  lastNotificationSubtype String?
  signedPayload           String    @db.Text
  claimedAt               DateTime?
  claimedByUserId         String?
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  @@index([claimedAt])
}
```

### Why each field exists

| Field                                          | Why                                                                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SubscriptionProvider`                         | Partitions the two rails. Both crons filter on it; the app picks its cancel adapter from it.                                                                                                           |
| `Plan.razorpayPlanId` nullable                 | An Apple-only plan has no Razorpay plan id. Relaxing it is what makes the enum honest.                                                                                                                 |
| `Plan.appleProductId`                          | The FK resolution key: a verified Apple transaction carries a `productId`, and that is how the row finds its `Plan`.                                                                                   |
| `Subscription.provider`                        | Defaults to `RAZORPAY`, so every existing row is correct with no backfill.                                                                                                                             |
| `Subscription.razorpaySubscriptionId` nullable | An Apple subscription has no Razorpay mandate.                                                                                                                                                         |
| `appleOriginalTransactionId`                   | **Apple's subscription identity.** Apple reuses ONE `originalTransactionId` for a subscription's entire lifetime, including across a lapse-and-repurchase. Unique, and the join key for every webhook. |
| `appleLatestTransactionId`                     | The newest transaction seen, for support and debugging.                                                                                                                                                |
| `appleProductId`                               | Which SKU is currently in force, so a `DID_CHANGE_RENEWAL_PREF` has something to move.                                                                                                                 |
| `appleEnvironment`                             | `"Sandbox"` or `"Production"`. Stored so sandbox and production traffic are never mixed.                                                                                                               |
| `User.appleAppAccountToken`                    | `@db.Uuid` because **Apple silently returns `null` for a non-UUID `appAccountToken`**. User ids are cuids, hence a dedicated column. Minted lazily on the first iOS `/plans` call.                     |
| `AppleUnlinkedTransaction`                     | The orphan store (§5). `signedPayload` holds the raw JWS so it can be replayed through the same verification path when claimed.                                                                        |
| `@@index([provider, currentPeriodEnd])`        | Exactly the query the Apple reconcile cron runs every 15 minutes.                                                                                                                                      |

### The migration is GENERATED but NOT APPLIED

File: `bombay-canvas-be/prisma/migrations/20260829000000_apple_iap/migration.sql`

Verified just now with the read-only `npx prisma migrate status` against the live Supabase database:

```
19 migrations found in prisma/migrations
Following migration have not yet been applied:
20260829000000_apple_iap
```

The migration is **purely additive**: one new enum, one new table, new nullable columns, two `DROP NOT NULL`s, new indexes. There is no `DROP TABLE`, no `DROP COLUMN`, no dropped constraint. It also ends with an idempotent backfill so an Apple purchase has a `Plan` to point at even if the seed is not re-run:

```sql
UPDATE "Plan" SET "appleProductId" = 'com.bombaycanvas.app1.premium.monthly' WHERE "code" = 'MONTHLY';
UPDATE "Plan" SET "appleProductId" = 'com.bombaycanvas.app1.premium.annual'  WHERE "code" = 'ANNUAL';
```

**Exact command to apply it** (run from `bombay-canvas-be`, with `DATABASE_URL` pointing at the target database):

```sh
cd /Users/mehul/Desktop/code/my_projects/canvas-hq/bombay-canvas-be
npx prisma migrate deploy
```

Take a Supabase backup first. The migration was generated with `prisma migrate diff --from-schema-datasource`, which round-tripped against the live schema — so as of the time of writing there is **zero drift** between the live database and the committed migrations.

---

## 7. Every file added or changed

### Backend — `bombay-canvas-be`

**New files**

| File                                                       | Purpose                                                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/migrations/20260829000000_apple_iap/migration.sql` | The additive migration. Not applied.                                                                                                                             |
| `src/config/apple.config.ts`                               | Product-id ↔ plan-code mapping both ways; `listApplePublicPlans`.                                                                                                |
| `src/config/apple.config.test.ts`                          | 9 tests over that mapping.                                                                                                                                       |
| `src/utils/appleVerify.ts`                                 | **The only place a JWS becomes data.** `SignedDataVerifier`, per-environment memoised, tries both environments.                                                  |
| `src/utils/appleVerify.test.ts`                            | Verification and environment-fallback tests.                                                                                                                     |
| `src/services/appleNotifications.ts`                       | Pure §7.1 type→effect mapping. No Prisma, no I/O, no clock.                                                                                                      |
| `src/services/appleNotifications.test.ts`                  | Mapping table tests.                                                                                                                                             |
| `src/services/appleSubscription.service.ts`                | The Apple rail's state machine: `applyAppleLifecycleEvent`, `grantAppleEntitlement`, `linkAppleTransactions`, orphan record/claim, `ensureAppleAppAccountToken`. |
| `src/services/appleSubscription.service.test.ts`           | 38 tests including the resurrection path.                                                                                                                        |
| `src/services/subscriptionView.service.ts`                 | The single client-facing "current subscription" projection, shared by `GET /me` and `/apple/verify`.                                                             |
| `src/services/subscriptionView.service.test.ts`            | 5 tests.                                                                                                                                                         |
| `src/controller/appleSubscription.controller.ts`           | `POST /apple/verify`, `POST /apple/link`.                                                                                                                        |
| `src/controller/appleWebhook.controller.ts`                | `POST /apple/webhook` — verify, idempotency gate, dispatch.                                                                                                      |
| `src/controller/appleWebhook.controller.test.ts`           | 11 tests.                                                                                                                                                        |
| `src/controller/subscription.plans.test.ts`                | 11 tests over the platform-aware `GET /plans`.                                                                                                                   |
| `src/services/cron/reconcileAppleSubscriptions.ts`         | Job 6, every 15 min, lock key 771006. Calls Apple's "Get All Subscription Statuses".                                                                             |
| `src/services/cron/reconcileAppleSubscriptions.test.ts`    | 12 tests.                                                                                                                                                        |
| `certs/apple/*.cer` (4 files) + `certs/apple/README.md`    | Apple's four public root CAs. **Already present and verified as real DER certificates.**                                                                         |

**Modified files**

| File                                           | Change                                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                         | The §4 data model.                                                                                                                                       |
| `prisma/seed.ts`                               | Sets `appleProductId`; parks it to `NULL` (not a `__seeding__` string) during the two-phase unique-column swap. TRIAL aliasing untouched.                |
| `src/config/env.ts`                            | The Apple env block + `validateAppleIapEnv()`.                                                                                                           |
| `src/server.ts`                                | Calls `validateAppleIapEnv()` next to `validateSubscriptionEnv()`.                                                                                       |
| `src/routes/subscription.route.ts`             | Three Apple routes + an `APPLE_IAP_ENABLED` 404 gate on `/apple`. Webhook sits **above** the `auth()` routes.                                            |
| `src/controller/subscription.controller.ts`    | `getPlans` splits into Apple/Razorpay payloads by platform; `getMySubscription` now delegates to `readCurrentSubscriptionView` so it carries `provider`. |
| `src/services/subscription.service.ts`         | `cancelSubscription` throws `APPLE_CANCEL_NOT_SUPPORTED` for an Apple row; `reconcileSubscription` throws `APPLE_RECONCILE_NOT_SUPPORTED`.               |
| `src/services/cron/reconcileSubscriptions.ts`  | Where-clause now leads with `provider: RAZORPAY`.                                                                                                        |
| `src/services/cron/index.ts`                   | Registers Job 6.                                                                                                                                         |
| `src/config/subscription.config.ts`            | `toPublicPlan()` extracted and exported so both rails project plans identically.                                                                         |
| `src/services/subscription.service.test.ts`    | +2 tests for the Apple cancel guard.                                                                                                                     |
| `src/services/subscription.offeredSet.test.ts` | +3 tests.                                                                                                                                                |
| `.env.example`                                 | Documents every new variable.                                                                                                                            |
| `package.json`                                 | `@apple/app-store-server-library@3.1.0`.                                                                                                                 |

### App — `bombay-canvas-app`

**New files**

| File                                                     | Purpose                                                                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/utils/paymentRail.ts`                               | `PAYMENT_RAIL` / `IS_APPLE_RAIL` / `IS_RAZORPAY_RAIL`. **The only `Platform.OS` check that decides how money is taken.**                                  |
| `src/services/paymentRail.ts`                            | The adapter interface + registry (`getPaymentRail`, `getRailForSubscription`).                                                                            |
| `src/services/payments/appleRail.ts`                     | Apple adapter: `startPurchase`, `cancel` (defers to the store sheet), `restore`.                                                                          |
| `src/services/payments/razorpayRail.ts`                  | Razorpay adapter — the pre-existing flow, moved behind the same interface.                                                                                |
| `src/services/iap/appleIap.ts`                           | All StoreKit contact: connection, listeners, `fetchProducts`, `requestPurchase`, `grantAndFinish`, `restoreApplePurchases`, `showManageSubscriptionsIOS`. |
| `src/config/iap.ts`                                      | Product ids, subscription group id `22338316`, SKU ↔ plan-code mapping.                                                                                   |
| `src/api/appleIap.ts`                                    | `verifyAppleTransaction`, `linkAppleTransactions` + their react-query hooks.                                                                              |
| `src/hooks/useAppleIapSync.ts`                           | **The silent restore.** Opens the connection on launch, claims orphans on every login.                                                                    |
| `src/hooks/useAppleCatalogue.ts`                         | Query for Apple's own `displayPrice` and intro-offer eligibility.                                                                                         |
| `src/components/subscription/paywallOffers.ts`           | Pure view-model: "what may this rail legally claim on the paywall".                                                                                       |
| `src/components/subscription/paywallOffers.test.ts`      | 5 tests — the only working app-side suite.                                                                                                                |
| `src/components/subscription/RestorePurchasesButton.tsx` | The App-Store-mandated visible restore control. Returns `null` off the Apple rail.                                                                        |

**Modified files**

| File                                                     | Change                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                                                | Calls `useAppleIapSync()`.                                                                                                   |
| `src/screens/SubscriptionScreen.tsx`                     | Rail-agnostic: delegates purchase to the adapter, renders `offers`, adds the restore button.                                 |
| `src/components/subscription/SubscriptionPlans.tsx`      | Props changed from `plans` + `trialEligible` to a single `offers: PaywallOffers`. Payment-marks footer hidden on iOS.        |
| `src/components/subscription/CancelSubscriptionFlow.tsx` | On the Apple rail (or on an `APPLE_CANCEL_NOT_SUPPORTED` refusal) swaps to the Apple-managed step and opens the store sheet. |
| `src/api/subscription.ts`                                | `provider` on the subscription type; `appleCatalogue` added to `ENTITLEMENT_QUERY_KEYS`.                                     |
| `tsconfig.json`                                          | `paths` redirect for `react-native-iap` — **typecheck-only**, see §11.                                                       |
| `package.json` / `package-lock.json`                     | `react-native-iap@^16.4.1`, `react-native-nitro-modules@^0.36.5`.                                                            |
| `ios/Podfile.lock`                                       | NitroIap 16.4.1, NitroModules 0.36.5, openiap 3.3.1.                                                                         |
| `ios/bombaycanvas.xcodeproj/project.pbxproj`             | `StoreKit.framework` linked (added by `pod install`). Deployment target untouched at 15.1.                                   |

> Note on naming: there are two files called `paymentRail.ts` — `src/utils/paymentRail.ts` (the platform constant) and `src/services/paymentRail.ts` (the adapter registry). They are different things. Worth renaming one day.

---

## 8. Key code

### 8.1 `finishTransaction` happens last — `app/src/services/iap/appleIap.ts`

```ts
try {
  await verifyAppleTransaction(signedTransaction);
} catch (error) {
  // Deliberately NOT finished. An unfinished transaction is replayed by
  // StoreKit on every launch, and that replay is the only thing standing
  // between a failed verify call and a user who paid but is not entitled.
  console.error('[iap] Verify failed; leaving the transaction queued', {
    productId: purchase.productId,
    transactionId: readTransactionId(purchase),
    error,
  });
  throw error;
}

invalidateEntitlementQueries(queryClient);

try {
  await finishTransaction({ purchase, isConsumable: false });
} catch (error) {
  // The grant already landed, so this is queue hygiene rather than a payment
  // failure: the next launch replays the transaction, the server verify is
  // idempotent, and finishing gets another attempt.
  console.warn('[iap] finishTransaction failed after a successful verify', {
    transactionId: readTransactionId(purchase),
    error,
  });
}
```

### 8.2 Listeners are installed before any purchase can be requested

```ts
// Registered at connection time, before any purchase can be requested.
// requestPurchase is event-based and never resolves with the purchase, so a
// listener installed after it would lose the transaction outright; installing
// them here also catches the deliveries that arrive with no purchase in flight
// — StoreKit's launch replay of unfinished transactions, and Ask-to-Buy
// approvals that land days later.
const registerListeners = () => {
  if (listeners.length > 0) return;
  listeners = [
    purchaseUpdatedListener(purchase => {
      settlePurchase(purchase).catch(error =>
        console.error('[iap] Failed to settle a purchase', error),
      );
    }),
    purchaseErrorListener(handlePurchaseError),
  ];
};
```

### 8.3 JWS verification tries both environments — `be/src/utils/appleVerify.ts`

The non-obvious part is `INVALID_APP_IDENTIFIER`. A naive single-status check silently drops all sandbox traffic.

```ts
// Both statuses mean "right signature, wrong verifier", so both must fall
// through to the other environment rather than reject.
//
// INVALID_ENVIRONMENT is the obvious one. INVALID_APP_IDENTIFIER is the
// non-obvious one and the reason a naive single-status check silently drops
// sandbox traffic: the Production verifier also compares appAppleId, and a
// Sandbox notification carries no appAppleId, so a sandbox payload reaching the
// Production verifier is rejected as a WRONG APP long before the environment
// comparison is ever reached. Retrying is safe either way — a payload that is
// genuinely for another app fails on both verifiers and is thrown out below.
const RETRY_OTHER_ENVIRONMENT_STATUSES: ReadonlySet<VerificationStatus> =
  new Set([
    VerificationStatus.INVALID_ENVIRONMENT,
    VerificationStatus.INVALID_APP_IDENTIFIER,
  ]);
```

The root certificates fail **closed**:

```ts
if (fileNames.length === 0) {
  throw new AppleVerificationError(
    `Apple root CA directory is empty (APPLE_ROOT_CA_DIR="${APPLE_ROOT_CA_DIR}"); see its README for the four certificates to place there`,
  );
}
```

### 8.4 The notification mapping switch — `be/src/services/appleNotifications.ts`

```ts
    case "DID_FAIL_TO_RENEW":
      // GRACE_PERIOD means Apple is retrying WHILE the user keeps access, which
      // is exactly what local PENDING models (it is in ACCESS_GRANTING_STATUSES
      // and the window is the real gate). Without the subtype the retry is
      // silent and access-less, which is HALTED.
      return subtype === "GRACE_PERIOD"
        ? lifecycle(SubscriptionStatus.PENDING, "DID_FAIL_TO_RENEW/GRACE_PERIOD")
        : lifecycle(SubscriptionStatus.HALTED, `DID_FAIL_TO_RENEW/${subtype ?? "-"}`);

    case "REFUND":
    case "REVOKE":
      // The ONE case that shortens a paid window. Apple has taken the money
      // back, so the access it bought has to go with it.
      return lifecycle(
        SubscriptionStatus.CANCELLED,
        `${notificationType}/${subtype ?? "-"} — money returned`,
        true
      );

    default:
      return noop(`unknown notificationType "${notificationType}"`);
```

### 8.5 `applyAppleLifecycleEvent` reuses `computeNextState` verbatim — `be/src/services/appleSubscription.service.ts`

Including the resurrection path, which is what lets a churned-and-returned user get entitlement again despite Apple reusing one `originalTransactionId` for the whole lifetime.

```ts
// Only status and the window reset: lastEventAt stays the real high-water
// mark so a later out-of-order event is still ordered against everything we
// have seen, not just against this lifetime.
const current: SubscriptionState = resurrected
  ? {
      status: SubscriptionStatus.CREATED,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      lastEventAt: persisted.lastEventAt,
    }
  : persisted;

const incoming: IncomingLifecycleEvent = {
  status: effect.status ?? subscription.status,
  periodStart: facts.purchaseDate,
  periodEnd: facts.expiresDate,
  eventAt: facts.eventAt,
  moneyBacked,
};
const next = computeNextState(current, incoming);

// The ONE place the never-shrinks window rule is deliberately broken. Apple
// has returned the money, so the access it bought goes with it — and
// computeNextState cannot express that, by design: nextPeriod is monotonic so
// no ordinary event can ever shorten a paid window.
const cutTo = effect.cutWindowToNow
  ? facts.revocationDate ?? facts.eventAt ?? new Date()
  : null;
const currentPeriodEnd = cutTo ?? next.currentPeriodEnd;
```

### 8.6 The silent restore hook — `app/src/hooks/useAppleIapSync.ts`

```ts
useEffect(() => {
  if (!IS_APPLE_RAIL || !isAuthenticated) return;

  // Required, not a nicety. Streamlined Purchasing is on and cannot be
  // disabled, so a subscription bought from the App Store product page reaches
  // the server with no appAccountToken and can only ever be attached to an
  // account by replaying the App Store's own receipts. Runs on launch and
  // again on every login — and stays silent, because it is housekeeping the
  // user never asked for and must not block or interrupt anything.
  console.log('[iap] Claiming App Store purchases', { userId });
  getPaymentRail()
    .restore()
    .catch(error => console.warn('[iap] Silent restore failed', error));
}, [isAuthenticated, userId]);
```

---

## 9. WHAT YOU MUST DO BY HAND

Ordered. Do them in this sequence — later items depend on earlier ones.

### 1. Paid Applications agreement + banking + US tax — **BLOCKING**

App Store Connect → Business → Agreements, Tax, and Banking.

- Sign the **Paid Applications** agreement.
- Add a bank account (Fradle Corporation, US).
- Complete the **US tax forms** (W-9 for a US entity).

**Why this is BLOCKING and not a formality:** until the agreement status is _Active_, `fetchProducts()` returns an **empty array** on every device, sandbox included. No error, no warning — just no products. The paywall will render with the DB fallback price and every purchase attempt will fail. This is slow (can take days) so start it first.

### 2. Accept the updated Apple Developer Program License Agreement — **BLOCKING**

developer.apple.com → Account. Must be done by the **Account Holder**, not an admin. An unaccepted agreement produces the same silent empty-product-list symptom as item 1.

### 3. Confirm In-App Purchase is on the App ID — **BLOCKING (verify only)**

developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → `com.bombaycanvas.app1`.

**Do NOT add an In-App Purchase entitlement to `ios/bombaycanvas/bombaycanvas.entitlements`.** There is no such entitlement key. IAP is available to any app with an _explicit_ (non-wildcard) App ID, which `com.bombaycanvas.app1` is. Adding `com.apple.developer.in-app-purchase` actively **breaks code signing** with "provisioning profile doesn't include the ... entitlement". The entitlements file correctly contains only `com.apple.developer.applesignin` — leave it alone.

Since the subscription group is already configured (spec §3), IAP is almost certainly already enabled. Just confirm.

### 4. Enable Billing Grace Period — **not blocking, strongly recommended**

App Store Connect → your app → Subscriptions → **Canvas Premium** (group `22338316`) → Billing Grace Period → On.

Without it, a failed renewal cuts access immediately. With it, Apple sends `DID_FAIL_TO_RENEW` with subtype `GRACE_PERIOD`, which the code maps to `PENDING` — access-granting — while Apple retries the card. The handling is already written; the setting is what makes it fire.

### 5. Create an App Store Connect API key — **BLOCKING for the reconcile cron**

App Store Connect → Users and Access → **Integrations** → App Store Connect API → **In-App Purchase** key type → Generate.

Collect three things:

- **Issuer ID** — a UUID, shown at the top of the Keys page → `APPLE_ISSUER_ID`
- **Key ID** → `APPLE_KEY_ID`
- **The `.p8` file** — downloadable **once only**. Save it somewhere safe immediately. → `APPLE_PRIVATE_KEY`

This is a **different credential** from any Sign in with Apple key you already have. Do not reuse the Sign in with Apple `.p8`.

Also grab the **numeric App Store app id** from App Store Connect → your app → App Information → Apple ID (a number like `6478...`, _not_ the bundle id) → `APPLE_APP_APPLE_ID`.

### 6. Apple root CA certificates — **ALREADY DONE, verify only**

An implementation note flagged this as outstanding, but the disk disagrees and the disk is right. All four are present at `bombay-canvas-be/certs/apple/` and `file(1)` confirms they are real DER certificates, not HTML error pages:

```
AppleComputerRootCertificate.cer   AppleIncRootCertificate.cer
AppleRootCA-G2.cer                 AppleRootCA-G3.cer
```

There is a `README.md` there with the download URLs and a refresh recipe. **What you must verify:** that your deployment actually ships the `certs/` directory. It is not in `.gitignore`, so committing it is sufficient — but if your Docker build or deploy script only copies `dist/`, the verifier will fail closed on the first real notification. Check this before turning the flag on.

```sh
cd /Users/mehul/Desktop/code/my_projects/canvas-hq/bombay-canvas-be/certs/apple
for f in *.cer; do openssl x509 -inform DER -in "$f" -noout -subject; done
```

### 7. Apply the migration — **BLOCKING**

Take a Supabase backup first. Then, with `DATABASE_URL` pointing at the target database:

```sh
cd /Users/mehul/Desktop/code/my_projects/canvas-hq/bombay-canvas-be
npx prisma migrate deploy
```

It is purely additive and safe to deploy on its own, ahead of any code. Confirm with `npx prisma migrate status`.

### 8. Seed the plans so `appleProductId` is populated — **BLOCKING**

The migration's backfill already sets both product ids, so this is belt-and-braces — but run it so the seed file and the database agree:

```sh
cd /Users/mehul/Desktop/code/my_projects/canvas-hq/bombay-canvas-be
npx prisma db seed
```

Then verify:

```sql
SELECT code, "razorpayPlanId", "appleProductId" FROM "Plan";
```

`MONTHLY` and `ANNUAL` must have Apple product ids. `TRIAL` must NOT — it is an alias code with no row of its own, and `appleProductId` is `@unique`.

### 9. Set the environment variables — **BLOCKING**

```sh
# ---- Apple In-App Purchase (iOS payment rail) ----
APPLE_IAP_ENABLED="false"          # keep FALSE for the first deploy

# APPLE_BUNDLE_ID already exists further up your .env — it is SHARED with
# Sign in with Apple. Do NOT add a second copy.
# APPLE_BUNDLE_ID="com.bombaycanvas.app1"

APPLE_APP_APPLE_ID="6478000000"    # NUMERIC App Store id, not the bundle id
APPLE_ISSUER_ID="69a6de70-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
APPLE_KEY_ID="ABCD1234EF"
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----"
APPLE_ENVIRONMENT="Sandbox"        # "Sandbox" (default) or "Production"
APPLE_ROOT_CA_DIR=""               # optional; defaults to <repo>/certs/apple
```

Notes:

- `APPLE_PRIVATE_KEY` accepts literal `\n` escapes — `env.ts` converts them to real newlines, so a single-line value from a secret manager works.
- `APPLE_ENVIRONMENT` is only the _default_ used before anything is decoded. Every verified payload carries its own environment and that is what the code branches on. It defaults to `Sandbox` deliberately: a `Production` default on a deploy that forgot the var would treat sandbox traffic as real money.
- When `APPLE_IAP_ENABLED=true`, **every** var above except `APPLE_ENVIRONMENT` and `APPLE_ROOT_CA_DIR` is required or the server **refuses to boot** (`validateAppleIapEnv`).

**Deploy sequence:** migration alone → backend with `APPLE_IAP_ENABLED=false` → set the credentials → flip to `true`.

### 10. Set the App Store Server Notifications V2 URL for **BOTH** environments — **BLOCKING**

App Store Connect → your app → **App Information** → App Store Server Notifications.

Set **Version 2** for **both** the Production URL **and** the Sandbox URL:

```
https://<your-api-host>/api/monetize/subscription/apple/webhook
```

Both must be set. TestFlight and App Review run against Sandbox; production users run against Production. The same endpoint handles both — `appleVerify.ts` tries both verifiers and records which environment accepted the payload.

**Caution:** while `APPLE_IAP_ENABLED=false` the `/apple` router returns **404**, which Apple treats as a failed delivery and retries for up to three days. That is the desired behaviour during rollout, but it is not a place to park: past the retry window, notifications received while dark are genuinely lost.

### 11. Xcode / build — **BLOCKING**

- **Deployment target ≥ 15.0** — already at **15.1** at all four sites in `project.pbxproj`, unchanged. Verify only.
- **`pod install`** — already run (NitroIap 16.4.1, NitroModules 0.36.5, openiap 3.3.1 in `Podfile.lock`). Re-run after any fresh clone:
  ```sh
  cd /Users/mehul/Desktop/code/my_projects/canvas-hq/bombay-canvas-app/ios && pod install
  ```
- **`StoreKit.framework`** — already linked into the app target by `pod install`. Verify only.
- **In-App Purchase capability** — see item 3. Nothing to add in Xcode.
- **Nitro version** — `react-native-nitro-modules` is pinned at `^0.36.5`, **not** 0.37.x. `react-native-iap@16.4.1` peer-requires `^0.36.5`, and for a `0.x` version a caret is restrictive: `0.37.1` does **not** satisfy it. Installing 0.37.x needs `--legacy-peer-deps` and is a genuine iOS build break, because react-native-iap ships nitrogen-generated C++/Swift bindings compiled against a specific nitro ABI. **Do not "upgrade" it.**

### 12. Before submitting to App Review — **BLOCKING for approval**

- Delete or gate the dead Razorpay purchase path in `src/api/video.ts` (see §11). A non-Apple purchase flow compiled into the iOS binary is a 3.1.1 liability even if unreachable.
- Confirm the **Restore Purchases** button is visible on the paywall. It is implemented (`RestorePurchasesButton.tsx`) — confirm it renders in the built app.
- Confirm no card/UPI payment marks appear on iOS. The footer is gated on `IS_RAZORPAY_RAIL`; confirm visually.
- Add the subscription's Privacy Policy and Terms of Use (EULA) links, which App Review requires on a subscription paywall.

### 13. After the first approved binary ships — **not blocking, do it eventually**

Once an approved build using the StoreKit APIs is live, App Store Connect will let you **turn Streamlined Purchasing off**. Doing so eliminates most future orphans. Keep the orphan handling regardless — it still serves reinstalls, device switches and offer codes.

---

## 10. How to test

### Local — StoreKit configuration file (no App Store Connect round trip)

This is the fastest loop and works before item 1 above is Active.

1. Xcode → File → New → File → **StoreKit Configuration File**. Name it `Canvas.storekit`, save under `ios/`.
2. Add a subscription group `Canvas Premium`, then two auto-renewable subscriptions with **exactly** these product ids:
   - `com.bombaycanvas.app1.premium.annual` — 1 year — ₹499 — with a **3-day free introductory offer**
   - `com.bombaycanvas.app1.premium.monthly` — 1 month — ₹99
3. Xcode → Product → Scheme → Edit Scheme → **Run** → Options → **StoreKit Configuration** → `Canvas.storekit`.
4. Run. Xcode's **Transaction Manager** (Debug → StoreKit → Manage Transactions) lets you force renewals, refunds, revokes and expiries on demand.

Caveat: a local StoreKit config does **not** send server notifications. It exercises the app path and `/apple/verify`, not the webhook.

### Sandbox — real Apple servers, compressed time

1. App Store Connect → Users and Access → **Sandbox** → Testers → create a tester with an email address that is **not** an existing Apple ID.
2. On the device: Settings → App Store → **Sandbox Account** → sign in as that tester. Do **not** sign into iCloud with it.
3. Build to the device (or TestFlight) and buy.

**Sandbox renewals are compressed**, which is what makes a year's lifecycle testable in an afternoon:

| Real duration | Sandbox duration |
| ------------- | ---------------- |
| 1 week        | 3 minutes        |
| **1 month**   | **5 minutes**    |
| 2 months      | 10 minutes       |
| 3 months      | 15 minutes       |
| 6 months      | 30 minutes       |
| **1 year**    | **1 hour**       |

A sandbox subscription auto-renews **6 times** then stops. The 3-day free trial compresses proportionally.

What to check as the clock runs:

- `Subscription.provider = APPLE`, `appleOriginalTransactionId` set, `appleEnvironment = 'Sandbox'`.
- `User.subscriptionStatus` / `subscriptionValidUntil` move on each `DID_RENEW`.
- `WebhookEvent` rows with `provider = 'apple'`, one per `notificationUUID`, settling to `processed`.
- Cancel in Settings → a `DID_CHANGE_RENEWAL_STATUS` / `AUTO_RENEW_DISABLED` → `cancelAtPeriodEnd = true`, **access retained** until the window ends.

### Firing Apple's TEST notification at the webhook

The cleanest end-to-end proof that Apple can reach you and that the JWS chain verifies.

**From App Store Connect:** App Information → App Store Server Notifications → next to the Sandbox URL, **Request a Test Notification**. It returns a `testNotificationToken`.

**Or from the App Store Server API** (`POST /inApps/v1/notifications/test`, then `GET /inApps/v1/notifications/test/{token}` to see the delivery result and the HTTP status you returned).

What should happen: `mapAppleNotificationToEffect` maps `TEST` to a `noop` ("audit-only"), the controller settles the `WebhookEvent` as `ignored` and returns **200**. So:

```sql
SELECT "eventId", type, outcome, "processedAt"
FROM "WebhookEvent"
WHERE provider = 'apple'
ORDER BY "createdAt" DESC LIMIT 5;
```

A row with `type = 'TEST'` and `outcome = 'ignored'` means signature verification, the idempotency gate and the dispatch loop are all working. A **400** means the JWS did not verify — check the root CA directory shipped and that `APPLE_BUNDLE_ID` matches. A **404** means `APPLE_IAP_ENABLED` is still `false`.

### Testing the orphan path deliberately

1. With the app **not installed** (or signed out), buy the subscription from the App Store product page using the sandbox tester.
2. Confirm an `AppleUnlinkedTransaction` row appears with `claimedAt = null`.
3. Install, sign in. `useAppleIapSync` fires on login.
4. Confirm the row gets `claimedAt` and `claimedByUserId` set, and the user has entitlement.

### Current gate status (re-run and verified while writing this)

| Gate                        | Result                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BE `npx tsc --noEmit`       | exit 0, zero errors                                                                                                                                                 |
| BE `npx vitest run src/`    | **40 files, 528 tests, all passing**                                                                                                                                |
| APP `npx tsc --noEmit`      | exit 0, zero errors                                                                                                                                                 |
| APP `npm test`              | `paywallOffers.test.ts` passes (5 tests); `__tests__/App.test.tsx` fails — **pre-existing**, `RNGestureHandlerModule` TurboModule invariant, unrelated to this work |
| `npx prisma migrate status` | `20260829000000_apple_iap` **not yet applied** — as intended                                                                                                        |

---

## 11. Known gaps / out of scope

### The refund path — be precise about what is and is not handled

**Apple's `REFUND` and `REVOKE` notifications ARE handled.** They map to `CANCELLED` and are the one case that **cuts the paid window back** to the revocation date, so an Apple refund does remove access. That had to be built, because Apple sends those notifications unprompted and ignoring them would be a live bug.

**The Razorpay dashboard-refund gap is untouched and remains open.** Today, refunding a payment from the Razorpay dashboard returns the money but does **not** revoke access. There is no `payment.refunded` / `refund.processed` handler; `NON_MONEY_CHARGE_STATUSES` only stops a refunded charge from _extending_ a window, it never shortens one. So a Razorpay refund still leaves the user with full access until their period ends naturally.

This is pre-existing, was explicitly out of scope (spec §11), and is now **asymmetric between the two rails** — Apple refunds cut access, Razorpay refunds do not. That asymmetry is worth knowing about when someone in support asks why one refund behaved differently from another.

### Trial eligibility leaks between the rails — accepted, by design

The two eligibility systems cannot see each other:

- An Apple trial **does** stamp `trialConsumedAt`, so someone who takes Apple's 3 free days cannot then take the ₹1 Razorpay trial on Android.
- The reverse is **not** blocked. Someone who already burned the ₹1 Razorpay trial can still get Apple's 3 free days, because Apple owns that decision per Apple ID + subscription group and will not consult us.

Accepted leak, documented in spec §10. On the iOS rail `trialEligible` is forced to `false` in the `/plans` payload, because it answers "is the ₹1 TRIAL plan on offer to you", and on iOS it never is.

### Open items nobody has fixed

| Item                                                     | Where                                                                                                                                                              | Severity                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dead Razorpay purchase path compiled into the iOS binary | `app/src/api/video.ts` — top-level `import RazorpayCheckout from 'react-native-razorpay'`, plus `openRazorpayCheckout` / `useRazorpayPayment` with zero call sites | **Fix before submission.** Unreachable, but a non-Apple purchase flow in an iOS binary is a 3.1.1 liability.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Hardcoded rupee copy shown to Apple subscribers          | `app/src/components/subscription/SubscriptionDetailsCard.tsx` — `PLAN_COPY` says `'Annual ₹499/yr'`, `'Monthly ₹99/month'`, `'Trial ₹1 then ₹499/yr'`              | Medium. Wrong currency for a non-Indian storefront, and the "₹1" line is Razorpay-only — Apple's trial is genuinely free. The **paywall** was fixed to use Apple's `displayPrice`; this **details card** was not.                                                                                                                                                                                                                                                                                                                              |
| Two files named `paymentRail.ts`                         | `app/src/utils/paymentRail.ts` vs `app/src/services/paymentRail.ts`                                                                                                | Cosmetic, but confusing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `AuthedRequest` shape duplicated four times              | `authMiddleWare.ts`, `subscription.controller.ts`, `engagement.controller.ts`, `appleSubscription.controller.ts`                                                   | Pre-existing debt, deliberately not half-fixed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| App-side jest harness is broken                          | `__tests__/App.test.tsx` — `RNGestureHandlerModule` TurboModule invariant, 0 tests execute                                                                         | Pre-existing, unrelated. It blocks writing app-side tests for anything importing `App.tsx` or native modules; `paywallOffers.ts` was written as a pure function specifically so it could be tested around this.                                                                                                                                                                                                                                                                                                                                |
| `tsconfig.json` `paths` redirect for `react-native-iap`  | `app/tsconfig.json`                                                                                                                                                | **Understand before touching.** `@react-native/typescript-config` sets `customConditions: ['react-native']`, so tsc resolves the library to its raw `src/*.ts` and typechecks the library's own source, producing 6 unfixable errors. The redirect points tsc at the package's published `.d.ts`. Nothing consumes `tsconfig` paths at runtime — no `babel-plugin-module-resolver`, no `tsconfig-paths`, Metro uses its default resolver — so this is **typecheck-only** and safe. If you add a path-resolving Babel plugin later, revisit it. |
| Prettier hook fights the committed style                 | BE repo                                                                                                                                                            | A `PostToolUse` hook runs prettier with `trailingComma: es5` while the committed code is prettier-3 (`all`). It reformats whole files on edit. `apple.config.ts` and `appleVerify.ts` are currently es5-formatted from when they were created. Cosmetic; worth fixing the hook.                                                                                                                                                                                                                                                                |
| No app-side test for `isAppleManagedCancelError`         | `app/src/api/subscription.ts`                                                                                                                                      | Cannot be loaded under the current jest setup (unmocked `@react-native-async-storage/async-storage`). Blocked by the broken harness above.                                                                                                                                                                                                                                                                                                                                                                                                     |

### Things that were deliberately NOT done

- **`applyLifecycleEvent` was not made provider-generic.** It is ~350 lines of Razorpay-specific money-gate and trial-phase reasoning, heavily tested and load-bearing. `applyAppleLifecycleEvent` is a sibling that shares `computeNextState` and `syncUserCache` but omits the money gate — Apple only ever reports `expiresDate` on a transaction it actually honoured, so the bug that gate exists to prevent cannot occur.
- **`subscription.transitions.ts` was not modified.** Verified: reused verbatim.
- **No migration was applied.** No `migrate dev`, `migrate deploy` or `db push` was run at any point.
- **Nothing was committed.** All of the above is in the working tree on both branches.
