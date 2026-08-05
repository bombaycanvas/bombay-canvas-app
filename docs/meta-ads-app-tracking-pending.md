# Meta Ads App Tracking — What's Left

Companion to `meta-ads-app-tracking.md`. That doc explains why. This one tracks what
still has to happen before app conversions report correctly.

Meta app: **Canvas OTT**, App ID `2541768999594895`
Dataset: **canvasott**, ID `2057047929031192` (app is linked to it)
Ad account: `1735447171077605`

Both halves — app and backend — are now written and uncommitted in their repos.
What remains is console setup, one design decision, deployment, and testing.

---

## Done

### App (`bombay-canvas-app`)

| Area            | Change                                                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Platform header | `X-Client-Platform` on the `api()` wrapper, plus the two raw `fetch()` calls that bypass it                                        |
| Device snapshot | `X-Client-App-Data` — `src/utils/analytics/appData.ts` builds it, cached at init                                                   |
| iOS config      | `Info.plist` — App ID, Client Token, `fb2541768999594895` URL scheme, `NSUserTrackingUsageDescription`, Meta's two SKAdNetwork IDs |
| Android config  | `strings.xml` App ID + Client Token, `AndroidManifest.xml` `AD_ID` permission + SDK meta-data                                      |
| Dependencies    | `react-native-fbsdk-next`, `react-native-tracking-transparency`, `react-native-device-info`, `js-base64`. Pods installed           |
| Events          | `InitiateCheckout` / `StartTrial` / `Subscribe` in `SubscriptionScreen.tsx`, `ViewContent` in `SeriesDetailScreen.tsx`             |

Deviations from the original doc, all deliberate:

- **Plan value reads from the API.** `Plan.price` is paise (`SubscriptionPlans.tsx:34`
  divides by 100), so the code uses `planDetails.price / 100`. Hardcoding drifts the
  moment pricing changes.
- **`track()` swallows its own errors.** It sits between payment and the `/me` poll. A
  throw there would abort the flow after money moved.
- **ATT status is resolved on both platforms.** The original only computed it on iOS,
  but the same boolean has to reach the server snapshot. Android's `'unavailable'`
  maps to allowed.

### Backend (`bombay-canvas-be`, branch `mehul-dev`)

`resolveActionSource()` replaces `isWebOrigin()`; `app_data` flows through
`buildEvent()`; `appData` JSON column added to `Subscription` and frozen inside
`subscription.create`. Migration `20260805120000_subscription_app_data` generated but
**not run**. 24 test files / 266 tests pass, `tsc` exits 0.

Web CAPI is unchanged and now has regression assertions locking it
(`subscription.metaEnqueue.test.ts:475-479` asserts web StartTrial still carries
`action_source: "website"`, still sends `event_source_url`, and has no `app_data`).

---

## The header contract

Verified end-to-end against the compiled backend validator, including a non-ASCII
carrier name and five malformed-shape rejections.

```
X-Client-App-Data: base64(UTF-8 JSON)      // standard base64, not base64url, <= 4096 chars
```

```jsonc
{
  "advertiser_tracking_enabled": 1, // required; same boolean given to the SDK
  "extinfo": [
    /* exactly 16 strings */
  ]
}
```

`extinfo` is **positional**. Meta reads slot 4 as the OS version regardless of what is
in it, so a 15- or 17-element array does not degrade — it shifts every field after the
gap. Unknown values are `""`, never omitted.

| #   | Field                                              | #   | Field                            |
| --- | -------------------------------------------------- | --- | -------------------------------- |
| 0   | version — `"i2"` iOS / `"a2"` Android **required** | 8   | carrier                          |
| 1   | app package name                                   | 9   | screen width                     |
| 2   | short version                                      | 10  | screen height                    |
| 3   | long version                                       | 11  | screen density                   |
| 4   | OS version **required**                            | 12  | CPU cores _(sent empty)_         |
| 5   | device model                                       | 13  | total storage GB                 |
| 6   | locale (`en_IN`)                                   | 14  | free storage GB                  |
| 7   | timezone abbreviation                              | 15  | device timezone (`Asia/Kolkata`) |

`application_tracking_enabled` is deliberately omitted rather than defaulted — Meta
reads a supplied `0` as an explicit opt-out.

Base64 rather than raw JSON because `extinfo` legitimately contains commas
(`"iPhone15,2"`) and non-ASCII (carrier names), neither of which survives an HTTP
header value intact — and because base64 cannot encode CR/LF, so it can't be used for
header injection.

**Failure mode to know:** a snapshot that fails validation is dropped and the
conversion is **suppressed entirely**, not sent degraded. A client bug therefore
produces _zero_ app conversions rather than bad ones. The backend logs it:

```
[meta-events] StartTrial suppressed: app conversion carries no usable device snapshot
```

---

## 1. Deploy ordering — will cause an outage if ignored

`appData` is written unguarded inside `subscription.create`. Run the migration
**before** deploying the backend code:

```bash
prisma migrate deploy    # first
# then deploy the code
```

Reversed, Prisma raises P2022 and the subscribe endpoint 500s entirely. Same class of
hazard as fe doc §9 Step 3.

The app and backend can ship independently in either order — an older app simply sends
no snapshot, and those conversions are suppressed until it updates.

---

## 2. Console — before shipping

- **Verify the Play App Signing hash.** Confirm one of the three hashes on the app
  matches Play Console → Setup → App integrity → **App signing key certificate** SHA-1:
  ```bash
  echo "AA:BB:CC:..." | tr -d ':' | xxd -r -p | openssl base64
  ```
  Google re-signs Play releases, so the upload-key hash does not cover production
  installs. A wrong hash silently costs Android attribution.
- **Replace the remaining placeholder URLs.** Terms of Service and Data deletion are
  still `https://www.facebook.com/`.
- **Publish → Live.** Required before real users emit events. Development mode still
  logs events from accounts holding a role on the app, which is all testing needs.

---

## 3. Open decision — ATT prompt placement

`initMetaSdk()` runs in `App.tsx`'s mount effect, so the iOS prompt fires on cold
launch. That follows the original doc but contradicts its own advice: ask at a moment
the user understands why.

Cold prompts on media apps are denied far more often than contextual ones, and a denial
is permanent unless the user digs into iOS Settings. Moving the call after onboarding or
first video play would raise opt-in. One-line move.

Denial is not fatal — events still send with `advertiser_tracking_enabled: 0`, match
quality just drops.

---

## 4. Verifying it works

Real device only. Simulators have no advertising ID and no ATT prompt.

1. **Events Manager → dataset `canvasott` → Test Events → App tab.**
2. **Test both ATT answers.** A denial must not crash anything or block the purchase.
3. **Check dedup.** Complete a real trial. `StartTrial` should appear twice — once from
   the SDK, once from the server — same `sub_...` event ID, shown as
   _1 event from 2 sources_. _1 event from 1 source_ means dedup is broken.
4. **Backend log during the drain:**
   ```
   [meta-events] enqueued StartTrial (initial) { eventId: 'sub_...' }
   [CRON] Running meta outbox drain
   [meta-capi] sent 1 event(s) [StartTrial] — received 1
   ```
   If you instead see `suppressed: app conversion carries no usable device snapshot`,
   the client header is not arriving — check it on `POST /subscription/create`.
5. **Reset between runs.** iOS: Settings → General → Transfer or Reset → Reset →
   Advertising Identifier.

Part 1 independently:

```sql
SELECT id, "originPlatform", "appData", "createdAt"
FROM "Subscription" ORDER BY "createdAt" DESC LIMIT 5;
```

Want `ios` / `android` and a populated `appData`, not `null`.

---

## 5. Known gaps and judgment calls

**Unverified: does Meta hard-reject app events lacking `extinfo`?** Their docs say
required; nobody has confirmed empirically without live traffic. The backend chose
suppress-over-send because a rejected batch is a permanent 4xx that burns all five
outbox attempts _and_ takes down every event batched alongside it in the same drain
tick. Cost: conversions from app builds predating the header are lost. If Meta turns
out to accept them, delete the gate at `metaEvents.service.ts:302`.

**`user_data.madid` / `anon_id` not implemented.** These are the strongest device-level
match signal an app conversion has — roughly what `fbc` is for web — and app match
quality will sit below web's without them. Left out because it means persisting an
advertising identifier in our database, which is a real DPDP consideration. Worth
deciding deliberately rather than by default; the header grows two optional strings.

**CPU cores (`extinfo[12]`) ships empty** — `react-native-device-info` doesn't expose
it. Not a required slot.

**App-origin renewals now report as `system_generated`** (previously suppressed) with
no `app_data` — nobody is holding the phone at 3am and a stored snapshot would be months
stale. Consistent with web renewals, but it is new data in Events Manager.

**`CompleteRegistration` now fires for app signups.** Only the backend can tell a
first-time signup from a returning login (`prisma.user.create`). Covered automatically
because the header goes out on every `api()` call.

**TVOD is out of scope, verified not assumed.** `Purchase.originPlatform` is written at
`paidSeries.controller.ts:577` but nothing reads it — there is no Meta event path for
TVOD anywhere in the codebase. App support would mean building that path first.

---

## 6. Unrelated, but found on the way

Neither affects Meta tracking; both affect shipping.

- `my-new-release-key.jks` and its passwords (`android/gradle.properties:45-48`) are
  **both committed to git**. `.gitignore` catches `*.keystore` but the file is `.jks`.
  Anyone with repo access can sign an APK as Canvas OTT.
- `gradle.properties` points `storeFile` at `android/app/my-upload-key.keystore`, which
  does not exist. The real keystore is at the repo root under a different name, so a
  release build fails as written.

---

## Checklist

**Deploy**

- [ ] `prisma migrate deploy` on the backend **before** deploying backend code
- [ ] Review + commit both repos (nothing is committed yet)

**Console**

- [ ] Play App Signing hash verified
- [ ] Terms of Service + Data deletion URLs replaced
- [ ] Publish → Live (ship day)

**App**

- [ ] Decide ATT prompt placement
- [ ] Rebuild both platforms — three new native deps since the last build
- [ ] Test on real iOS + Android devices, both ATT answers
- [ ] Confirm dedup shows _1 event from 2 sources_

**Decide later**

- [ ] `madid` / `anon_id` for app match quality (DPDP call)
