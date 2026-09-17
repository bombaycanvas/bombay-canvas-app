# Publishing Canvas OTT to the App Store

TestFlight is a soft launch — Apple barely looks. The App Store is the real thing: a human
reviewer opens your app, pokes at it, and can say no. This doc is about surviving that.

Read [TESTFLIGHT.md](./TESTFLIGHT.md) first. You submit a build that's _already on TestFlight_,
so everything there applies before anything here does.

## How review differs from TestFlight

|                 | TestFlight (internal) | App Store review                               |
| --------------- | --------------------- | ---------------------------------------------- |
| Who looks at it | nobody                | an actual person at Apple                      |
| Wait            | ~20 min processing    | 24–48 hours, sometimes longer                  |
| Can be rejected | no                    | yes, and often                                 |
| Who can install | 100 teammates         | everyone on Earth                              |
| Undo            | expire the build      | pull the app, but the review is on your record |

Rejection isn't a disaster — you fix it and resubmit, usually a day or two lost. But each round
trip costs a day, so it's worth getting right the first time.

---

## Before you submit: current state

### ✅ Already handled

Someone did the hard work here. Don't undo it:

- **Payments go through Apple on iOS.** This is the big one. Apple's guideline 3.1.1 says digital
  subscriptions must be sold through In-App Purchase, and they reject apps that route around it to
  dodge the 30% cut. `src/utils/paymentRail.ts` has a single constant that picks `apple` on iOS and
  `razorpay` everywhere else, and the Razorpay checkout is only reachable through an adapter that
  iOS never selects. The button isn't hidden — the code path genuinely doesn't exist on iOS. That's
  the distinction reviewers test for.
- **Restore Purchases exists** — `RestorePurchasesButton` on the subscription screen. Required by
  3.1.1. Reviewers do tap this.
- **Account deletion exists** — in `SettingsScreen`. Required by 5.1.1(v) for any app with sign-up.
  This one gets a _lot_ of apps rejected.
- **Sign in with Apple exists.** Required whenever you offer other social logins, and this app has
  Google.
- **Permission strings are written and specific** — Bluetooth, local network, microphone, photo
  library, and tracking all have real sentences explaining why. Empty or vague ones are an
  automatic rejection.
- **Export compliance is answered** — `ITSAppUsesNonExemptEncryption` is `false` in `Info.plist`,
  so you don't get asked on every upload.

### ⚠️ Fix these before submitting

**1. The version number doesn't match.**

App Store Connect has a version record labelled **2.0** sitting in `READY_FOR_REVIEW` since
6 August — prepared, never submitted. The live public version is **2**. Meanwhile the code is at
**2.3**.

A build can only attach to a version record with a matching version string. So either:

- edit that 2.0 record's version to `2.3` in App Store Connect, **or**
- create a fresh 2.3 version record

You can't attach a 2.3 build to a record that says 2.0. Sort this out first or the submit button
just won't cooperate.

**2. `NSAllowsArbitraryLoads` is `true`.**

In `ios/bombaycanvas/Info.plist`, this switches off Apple's requirement that all network traffic
use HTTPS. Review sometimes asks you to justify it, and "we didn't get round to it" isn't a great
answer.

Your backend is already HTTPS (Cloud Run), so this probably exists for local development. Ideally
turn it off and add a narrow exception if some specific host genuinely needs plain HTTP. If you
leave it on, be ready to explain why in the review notes.

**3. Dead Razorpay code in `src/api/video.ts`.**

`useRazorpayPayment` (line 418) calls `RazorpayCheckout.open` directly, completely bypassing the
payment rail gate. It is **not currently reachable** — nothing imports it — so it's not a
rejection risk today. But it's a loaded gun: the day someone wires it into a "buy this series"
button, iOS ships a non-Apple payment flow and you get rejected under 3.1.1 with no idea why.

Delete it, or route it through `getPaymentRail()` like everything else.

---

## Things you fill in on Apple's website

None of this is code. All of it can block your submission.

### Paid Applications Agreement

**Without this, your subscriptions do not work in production.** Not "work badly" — the purchase
sheet won't appear at all.

App Store Connect → **Business** (or **Agreements, Tax, and Banking**). You need:

- the Paid Applications agreement accepted
- banking details filled in
- tax forms completed

This has to be done by whoever holds the Account Holder role. It can take days if the bank details
need verifying, so check it early rather than the night you want to ship.

### Subscription setup

Every subscription product needs, in App Store Connect:

- a **localized display name** and **description** (what users see in the purchase sheet)
- a **price** for every territory you sell in
- a **review screenshot** — an actual image of your paywall showing that product
- a **subscription group** with the products ranked (this is what makes upgrade/downgrade work)

Products stuck in "Missing Metadata" won't be reviewed and won't work. Also: subscription products
get reviewed _alongside_ your first submission containing them, so a broken product description can
sink the whole release.

### App Privacy

App Store Connect → your app → **App Privacy**. You declare every kind of data you collect.

This app needs care because it uses the **Meta (Facebook) SDK** and **App Tracking Transparency**.
That combination means you are doing tracking as Apple defines it — linking user data to third-party
data for advertising. You must declare:

- data **used for tracking** (the Meta SDK's advertising identifiers)
- whatever the analytics and login flows collect — email, name, user ID, usage data

Getting this wrong is worse than most rejections, because Apple can pull a live app for a privacy
declaration that doesn't match observed behaviour. If you're unsure what the Meta SDK sends, check
its docs rather than guessing.

Related: because the app calls `requestTrackingPermission`, the ATT prompt **must actually appear**
before any tracking starts. Reviewers check this. The permission string is already written.

### Screenshots and metadata

- Screenshots for **6.9"** and **6.5"** iPhone displays (Apple scales the rest)
- Description, keywords, support URL, marketing URL
- **Privacy policy URL** — mandatory, and mandatory for subscriptions specifically
- Age rating questionnaire — be honest about content; a streaming app usually isn't 4+
- **Terms of Use (EULA)** link — required for auto-renewing subscriptions

### The demo account (do not skip this)

In **App Review Information**, give the reviewer a working login:

- username and password for an account that already has an active subscription
- notes explaining how to reach the paywall and what to test

**The single most common rejection is "we couldn't sign in."** A reviewer who hits a login wall
rejects in about thirty seconds. Test the demo credentials yourself, on a real device, right before
you submit. If sign-in needs an OTP or a phone number, say exactly how to get past it — reviewers
won't figure it out and won't email to ask.

---

## Submitting, step by step

1. **Ship a build to TestFlight** and confirm it works on a real device.
   ```sh
   cd ios && bundle exec fastlane ios beta
   ```
2. **Install it from TestFlight yourself.** Buy a subscription in sandbox. Restore it. Delete an
   account. Actually do these — this is the same path the reviewer walks.
3. **Fix the version record** so it matches the build's version (see above).
4. **Fill in everything** from the section above. App Store Connect shows a yellow warning triangle
   next to anything incomplete.
5. **Pick your build.** In the version page, **Build** section, choose the TestFlight build. It
   only appears once processing finishes.
6. **Choose the release method:**
   - _Automatic_ — goes live the moment it's approved
   - _Manual_ — you press the button (safer; you control the timing)
   - _Scheduled_ — a specific date
7. **Add to Review** → **Submit**.
8. **Wait.** State goes `Waiting for Review` → `In Review` → `Pending Developer Release` or
   `Ready for Sale`. Usually 24–48 hours. Apple emails at each step.

---

## What reviewers actually poke at, for this app

Based on what this app does, expect them to:

- **Try to pay.** They'll open the paywall and check it uses Apple's purchase sheet, not a web
  view. Handled, as long as the dead Razorpay code stays unreachable.
- **Tap Restore Purchases.** It must do something visible, even with nothing to restore.
- **Look for account deletion.** In Settings. It must actually delete, not just log out.
- **Watch for the tracking prompt.** ATT must appear before tracking starts.
- **Sign in.** With your demo account. See above. Seriously.
- **Check subscription disclosures.** Near the buy button you need: price, billing period, what
  auto-renew means, and links to your Privacy Policy and Terms. Apple is strict here and it's a
  frequent rejection for subscription apps.

---

## When they reject you

You'll get a message in **App Store Connect → Resolution Center** naming a guideline number.

**Don't panic and don't resubmit blind.** The process:

1. Read the guideline they cite. They're all at
   [developer.apple.com/app-store/review/guidelines](https://developer.apple.com/app-store/review/guidelines/).
2. If they misunderstood something, **reply in Resolution Center**. You can just talk to them, and
   it's often faster than a code change. A clear explanation resolves a lot of rejections.
3. If it's a real problem, fix it, ship a new build to TestFlight, attach it, resubmit.

Common ones for an app like this:

| Guideline | Meaning                                        | Fix                                          |
| --------- | ---------------------------------------------- | -------------------------------------------- |
| 2.1       | "We couldn't sign in" / it crashed             | Fix the demo account. Usually this.          |
| 3.1.1     | Payments dodging In-App Purchase               | Make sure no iOS path reaches Razorpay       |
| 5.1.1(v)  | No account deletion                            | Already implemented — point them to Settings |
| 5.1.2     | Privacy declarations don't match behaviour     | Fix App Privacy answers                      |
| 4.0       | Design / UI problems                           | Usually specific and fixable                 |
| 2.3.x     | Screenshots or description don't match the app | Update the metadata                          |

A rejection isn't a black mark. Plenty of shipped apps got rejected several times first.

---

## After approval

- On **Manual release**, the app sits in `Pending Developer Release` until you press the button.
- Rollout to the App Store takes a few hours to appear everywhere.
- **Phased release** (a toggle on the version page) ships to 1% of users, then 2%, 5%, and so on
  over 7 days. Worth using — if something's badly broken you can pause it before everyone gets it.
- Watch crash reports in **Xcode → Organizer → Crashes** for the first few days.

If something is badly wrong after release, you can **Remove from Sale** immediately. Getting a fix
approved still takes a normal review cycle, unless you request an **expedited review** — which
works, but Apple notices if you cry wolf.

---

## Related

- [TESTFLIGHT.md](./TESTFLIGHT.md) — the build and upload pipeline everything here depends on
