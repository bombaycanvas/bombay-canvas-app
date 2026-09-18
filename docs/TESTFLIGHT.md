# Getting Canvas OTT onto TestFlight

TestFlight is Apple's "try the app before it's on the App Store" system. You upload a build,
your testers get it in the TestFlight app on their phone. That's it.

The whole thing is one command now. Most of this doc is explaining _why_ it works, so when it
breaks you know where to look.

|                                          |                                |
| ---------------------------------------- | ------------------------------ |
| App name                                 | Canvas OTT                     |
| Apple ID (numeric)                       | `6753294439`                   |
| Bundle ID                                | `com.bombaycanvas.app1`        |
| Team ID                                  | `UKWJKZWBXY`                   |
| Version (`MARKETING_VERSION`)            | `2.3`                          |
| Build number (`CURRENT_PROJECT_VERSION`) | bumped automatically           |
| Workspace                                | `ios/bombaycanvas.xcworkspace` |

## The short version

```sh
cd ios
bundle exec fastlane ios beta
```

Wait ~15 minutes. Done. Skip to [What that command actually does](#what-that-command-actually-does)
if you want to know what happened.

---

## One-time setup

You only ever do this once per Mac. If someone already handed you a working machine, skip ahead.

### 1. Install the tools

```sh
npm install
bundle install
cd ios && bundle exec pod install && cd ..
```

`bundle install` reads the `Gemfile` and installs fastlane and CocoaPods at the exact versions
this project expects. Using a globally-installed fastlane instead usually works but can break in
confusing ways, which is why every command below starts with `bundle exec`.

### 2. Get an App Store Connect API key

This is the thing that lets a script talk to Apple as you. Without it, uploading means clicking
through Xcode by hand every time.

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access**
2. Click the **Integrations** tab
3. In the left sidebar pick **App Store Connect API**, then **Team Keys**
4. Hit **+**, name it something like `TestFlight Upload`
5. **Access must be `Admin`.** Not App Manager. See the warning below.
6. Download the `.p8` file — **Apple only lets you download it once, ever**

Then put it where the tooling looks for it:

```sh
mkdir -p ~/.appstoreconnect/private_keys
mv ~/Downloads/AuthKey_XXXXXXXXXX.p8 ~/.appstoreconnect/private_keys/
chmod 600 ~/.appstoreconnect/private_keys/AuthKey_XXXXXXXXXX.p8
```

> **Why Admin and not App Manager?**
> Signing a build needs a distribution certificate. Nobody on this project keeps one in their
> local keychain, so we use _cloud signing_ — Apple holds the certificate and signs on their
> side. Cloud signing only works if the API key has Admin access. An App Manager key can read
> your certificates perfectly fine, which makes it look like it's working, and then fails at the
> very last step with `Cloud signing permission error`. We burned an evening on this.

> **Never commit the `.p8` file.** It's a private key — anyone with it can upload builds as you.
> `.gitignore` blocks `*.p8`, but the file starts life in `~/Downloads`, so move it, don't copy it.

### 3. Tell fastlane about your key

The Fastfile has the current key baked in as a default. If you made your own, override it:

```sh
export ASC_KEY_ID=YOURKEYID
export ASC_ISSUER_ID=3e76ad7c-ce98-42f7-900e-4b2f8157da4a
```

The Issuer ID is the same for everyone on the team — it's printed at the top of that same
**Integrations** page.

---

## Before every release: check `.env`

**Read this bit even if you skip everything else. This is the one that actually bites.**

Open `.env` at the repo root and look at `NEXT_PUBLIC_BASE_URL`. There are a bunch of commented-out
lines; exactly one should be uncommented, and it should be the real backend:

```
NEXT_PUBLIC_BASE_URL="https://bombay-canvas-new-dev-v2-1018893063821.asia-south1.run.app"
```

Here's why this is dangerous. The app reads that value through `react-native-dotenv`, which does
**not** read the file when the app runs. It pastes the value directly into the JavaScript at build
time. So the URL becomes a permanent part of the build, like a phone number written in pen.

Two ways that goes wrong:

1. **You forgot to change `.env`.** Build ships pointing at your laptop or a dead ngrok tunnel.
   Testers install it, nothing loads, no error message explains why.
2. **You changed `.env` but Metro cached the old value.** Metro (the JS bundler) keeps a cache to
   go faster, and that cache doesn't always notice `.env` changed. So you fix the file, rebuild,
   and it _still_ ships the old URL. This one is genuinely nasty because you did the right thing
   and got punished anyway.

This actually happened: build `2.3 (1.5)` went to TestFlight pointing at an ngrok tunnel that was
already dead.

**So there's now a guard.** After building, the `beta` lane digs into the compiled JS bundle and
checks the URLs inside it. It kills the release if it finds:

- a dev host — `ngrok`, `localhost`, `127.0.0.1`, a `192.168.*` LAN IP, or port `5050`
- **or** if the URL currently in `.env` isn't in the bundle at all

That second check is the important one — that's the stale-cache case, where nothing looks wrong.

If the guard trips, clear the cache and rebuild:

```sh
rm -rf "$TMPDIR"/metro-* "$TMPDIR"/haste-* node_modules/.cache
```

You can also check a build without uploading anything:

```sh
cd ios && bundle exec fastlane ios verify_archive
```

---

## What that command actually does

```sh
cd ios
bundle exec fastlane ios beta
```

Step by step:

1. **Logs into Apple** with your API key.
2. **Asks what's already on TestFlight.** Say it finds `1.6`.
3. **Bumps the build number** to `1.7` and writes it into the Xcode project.
4. **Builds and archives** — compiles all the native code and pods. This is the slow part, 10–15
   minutes. Grab a snack.
5. **Checks the backend URL** in the compiled bundle. Stops here if it's wrong.
6. **Exports and signs** the app using cloud signing.
7. **Uploads to App Store Connect.**
8. **Sets the changelog** once Apple finishes processing.

Add release notes for your testers like this:

```sh
bundle exec fastlane ios beta changelog:"Fixed the crash on the paywall screen"
```

### The other lanes

| Command                       | What it's for                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `fastlane ios status`         | Compares your local version/build against what's live. Takes 2 seconds. Run it when you're not sure whether your last upload worked.          |
| `fastlane ios verify_archive` | Checks the backend URL baked into the most recent archive. Doesn't upload.                                                                    |
| `fastlane ios upload_archive` | Re-exports and uploads an archive you already built. Use this when the build succeeded but the upload died — saves you the 15-minute rebuild. |

`upload_archive` is a real time-saver. Upload failures are common (network blips, expired tokens)
and there's no reason to recompile the entire app because a network request timed out.

---

## Build numbers, and why you can't reuse them

Two different numbers, and people mix them up constantly:

- **Version** (`MARKETING_VERSION`, currently `2.3`) — what users see. Changes when you ship
  something meaningful.
- **Build number** (`CURRENT_PROJECT_VERSION`, currently in the `1.x` series) — an internal
  counter. Goes up **every single upload**, even if you only changed one line.

Apple will reject an upload if it's seen that build number before for that version. And here's the
part that catches people: **that number is burned forever.** You can't delete a build and reuse
its number. If you upload `1.7` and it's broken, your next attempt is `1.8`. There's no undo.

Our numbers are dotted (`1.5`, `1.6`, `1.7`) rather than plain integers. That's a bit unusual but
it's fine — Apple compares them piece by piece like version numbers, so `1.7` correctly sorts
above `1.6`. The lane just adds one to the last piece.

You never have to set this by hand. The lane reads what's on TestFlight and bumps from there,
which means it stays correct even if someone else uploaded from a different Mac.

> **Note:** the lane writes the build number straight into the Xcode project settings. It
> deliberately does _not_ use `agvtool`, Apple's usual tool for this, because `agvtool` rewrites
> `Info.plist` and replaces `$(CURRENT_PROJECT_VERSION)` with a hardcoded number — quietly
> breaking the link between the project setting and the plist.

---

## Getting it to your testers

Once the build finishes processing (10–30 minutes, occasionally an hour), go to App Store Connect
→ Canvas OTT → **TestFlight**.

**Internal testers** — up to 100 people, and they must have an App Store Connect account on the
team. **No review.** The build is installable within minutes of finishing processing. This is what
you want for the dev team and anyone at the company.

**External testers** — up to 10,000 people, any email address, no account needed. Requires **Beta
App Review**, which is a real human at Apple looking at your app. Usually a day or two. You have
to fill in "What to Test" and a beta description first. Rejections here are rarer and gentler than
full App Store review, but they do happen — most often for a broken sign-in or a paywall the
reviewer can't get past.

Testers install the **TestFlight** app from the App Store, then tap the invite link in their email.
Builds expire after **90 days**.

### Expiring a bad build

If you ship something broken, go to **TestFlight → Builds**, pick it, and hit **Expire**. It
disappears for testers immediately. Do this rather than hoping nobody installs it — a tester on a
broken build files confusing bug reports about problems you already fixed.

---

## When it breaks

**`Cloud signing permission error` / `No signing certificate "iOS Distribution" found`**
Your API key isn't Admin. Make a new key with Admin access ([step 2](#2-get-an-app-store-connect-api-key)).
You can't change an existing key's role — Apple makes you create a new one. Note that a
certificate showing up in the developer portal does _not_ mean you can use it: a certificate is
half of a key pair, and the private half lives on whichever Mac created it.

**`Authentication credentials are missing or invalid`**
Wrong key type. Apple hands out several kinds of `.p8` and they all look identical:

- `AuthKey_*.p8` from **App Store Connect → Integrations** — this is the upload key you want
- `AuthKey_*.p8` from **developer.apple.com → Keys** — push notifications or Sign in with Apple
- `SubscriptionKey_*.p8` — In-App Purchase keys, for the App Store _Server_ API

You cannot tell them apart from the filename. If auth fails, you probably grabbed the wrong one.

**`The bundle version must be higher than the previously uploaded version`**
Build number collision. Run `fastlane ios status` to see what Apple actually has, then rerun
`beta` — it reads the real number from Apple, so this shouldn't happen unless something was
uploaded by hand.

**Guard says `Bundle points at dev backend(s)`**
`.env` has a dev URL uncommented. Fix it, clear the Metro cache, rebuild.

**Guard says `Bundle is missing <url>`**
Stale Metro cache. `.env` is right but the build didn't pick it up:

```sh
rm -rf "$TMPDIR"/metro-* "$TMPDIR"/haste-* node_modules/.cache
```

**Build uploaded but never appears in TestFlight**
Check email for an `ITMS-` error from Apple. These are usually specific and readable. The classic
one is an unanswered export-compliance question, which `ITSAppUsesNonExemptEncryption` in
`Info.plist` already prevents for us.

**Pod or build errors after pulling new code**

```sh
cd ios && bundle exec pod deintegrate && bundle exec pod install
```

Then in Xcode: **Product → Clean Build Folder** (Shift-Cmd-K).

**App installs but the API doesn't work**
`.env` again, almost always. See the section above.

---

## Related

- [Publishing to the App Store](./APP_STORE_REVIEW.md) — going from a TestFlight build to
  something the public can download. Much stricter, and there are open issues to fix first.
