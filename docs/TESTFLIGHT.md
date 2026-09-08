# Getting Canvas onto TestFlight

This app is bare React Native — no Expo, no EAS, no fastlane. So the way to TestFlight is:
build an archive in Xcode, upload it, hand out invites. Here's the whole thing, in order.

| | |
|---|---|
| App name | Canvas |
| Bundle ID | `com.bombaycanvas.app1` |
| Team ID | `UKWJKZWBXY` |
| Version (`MARKETING_VERSION`) | `2.0` |
| Build number (`CURRENT_PROJECT_VERSION`) | `1` → bump me |
| Open this file | `ios/bombaycanvas.xcworkspace` |

## What you need first

- A **paid Apple Developer account** ($99/year) that's on the Bombay Canvas team. Free accounts can't do TestFlight.
- That account signed into Xcode: **Xcode → Settings → Accounts**.
- A Mac with Xcode 16 or newer, and CocoaPods installed.

You do *not* need a physical iPhone to upload. You do need one to test.

## The steps

### 1. Get the project building

Fresh dependencies, fresh pods. Run this from the repo root:

```sh
npm install
bundle install
cd ios && bundle exec pod install && cd ..
```

Then double-check `.env` exists and points at **production**. The app reads it through
`react-native-dotenv`, which bakes the values in *at build time* — so if `NEXT_PUBLIC_BASE_URL`
is still pointing at localhost, you'll ship a build that talks to nothing and there's no error
telling you why.

### 2. Make the app record (once ever)

Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**.

- Platform: iOS
- Bundle ID: pick `com.bombaycanvas.app1` from the dropdown
- SKU: anything unique, like `canvas-ios`

If the bundle ID isn't in the dropdown, it hasn't been registered yet — go to
[Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers)
and add it there first, with **Sign in with Apple** turned on (the app uses it).

### 3. Bump the build number

This is the step everyone forgets. Apple rejects any upload whose build number it has seen
before for that version. Right now it's `1`.

In Xcode: select the **bombaycanvas** target → **General** → set **Build** to `2`.
Version stays `2.0`.

Rule of thumb: build number goes up by one *every single upload*. Version only changes when
you actually ship something new to users.

### 4. Add the encryption key (once ever)

Otherwise App Store Connect asks you the same "does your app use encryption?" question on every
single upload and blocks the build until you answer it. Add this to `ios/bombaycanvas/Info.plist`:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

This is the normal answer for an app that only uses HTTPS. Which is us.

### 5. Archive it

Open `ios/bombaycanvas.xcworkspace` — the **workspace**, not the `.xcodeproj`. Opening the wrong
one means no pods and a wall of errors.

- Scheme (top left): **bombaycanvas**
- Device dropdown: **Any iOS Device (arm64)** — not a simulator
- Then **Product → Archive**

Takes 5–15 minutes. If **Archive** is greyed out, you've still got a simulator selected.

### 6. Upload it

The Organizer window pops open when the archive finishes. Pick your archive, then:

- **Distribute App** → **App Store Connect** → **Upload**
- Leave the defaults on (symbols on, manage signing automatically)
- **Upload**, then wait for the green check

Xcode handles certificates and provisioning profiles for you here. You don't need to make them
by hand.

### 7. Wait for processing

In App Store Connect → your app → **TestFlight** tab, the build shows up as *Processing*.
Usually 10–30 minutes, sometimes an hour.

If Apple finds a problem it emails you instead, with an error code like `ITMS-90XXX`.
Read the email — it says exactly what's wrong.

### 8. Hand out invites

Two flavours, and the difference matters:

- **Internal testers** — up to 100 people, must be on your App Store Connect team. *No review.*
  They can install within minutes. This is what you want for the dev team.
- **External testers** — up to 10,000, any email address. Needs **Beta App Review** (usually a day
  or two) and you have to fill in the "What to Test" and beta description fields first.

Testers install the **TestFlight** app from the App Store, then tap the invite link in their email.

## Stuff that will bite you

### Razorpay vs. Apple's in-app purchase rule

The app takes payments through Razorpay and there's no IAP library installed yet. Apple requires
digital content — subscriptions, unlocking videos — to be sold through **in-app purchase**, and
they reject apps that route around it. Internal TestFlight won't care. External Beta Review and
the real App Store review absolutely will. That's what the `feat/apple-iap-impl` branch is for,
so land it before you go external.

### Two empty strings in Info.plist

`NSLocationWhenInUseUsageDescription` and `LSApplicationCategoryType` are both empty. An empty
permission message is a known rejection reason — the pop-up shows the user a blank explanation.
Either write a real sentence or delete the key if the app never asks for location.

### Arbitrary loads are turned on

`NSAllowsArbitraryLoads` is `true`, which switches off Apple's HTTPS requirement. Fine for
TestFlight, but App Store review can ask you to justify it. Better to turn it off and only allow
specific domains if something genuinely needs plain HTTP.

## When it breaks

**"No account for team UKWJKZWBXY"**
Your Apple ID isn't signed into Xcode, or isn't on the team. Xcode → Settings → Accounts → add the
account, then hit **Download Manual Profiles**.

**"The bundle version must be higher than the previously uploaded version"**
You reused a build number. Bump it again and re-archive. You cannot delete a build number and
reuse it — that number is burned forever.

**Archive is greyed out in the Product menu**
A simulator is selected as the destination. Switch to **Any iOS Device (arm64)**.

**Pod / build errors after pulling new code**
Nuke and redo: `cd ios && bundle exec pod deintegrate && bundle exec pod install`.
Then in Xcode, **Product → Clean Build Folder** (Shift-Cmd-K).

**Build uploaded but never shows in TestFlight**
Check your email for an ITMS error. Also check whether it's stuck on an unanswered
export-compliance question, which step 4 prevents.

**App installs from TestFlight but the API doesn't work**
Almost always `.env`. Release builds bake in whatever was in that file at build time, so a stale
or localhost `NEXT_PUBLIC_BASE_URL` ships silently. Fix the file, bump the build, re-archive.

---

Once step 2 and step 4 are done, every future release is just: bump the build number → Archive →
Distribute → wait. About ten minutes of actual work.
