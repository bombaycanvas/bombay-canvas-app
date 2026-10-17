# Expo, EAS Build and OTA updates

The app is a bare React Native project with Expo modules added on top. `android/` and `ios/`
are still ours and still committed: Expo did not generate them and must never regenerate them.
What Expo gives us:

- **Expo CLI**: the dev server (`expo start`) and local builds (`expo run:*`).
- **EAS Build**: builds the APK/AAB/IPA in Expo's cloud, so iOS builds don't need a Mac.
- **EAS Update**: pushes JavaScript changes to installed apps without a store release (OTA).

|                     | Android                  | iOS                     |
| ------------------- | ------------------------ | ----------------------- |
| App ID              | `com.bombaycanvas`       | `com.bombaycanvas.app1` |
| Version             | `android/app/build.gradle` (`versionName`) | Xcode `MARKETING_VERSION` |
| Build number        | stored on EAS (remote)   | stored on EAS (remote)  |
| Expo owner / slug   | `tech.bombaycanvas` / `bombay-canvas` |            |
| EAS project ID      | `4b2cc79d-0217-48e2-ba20-0884a5754df9` |           |

Expo SDK 54, React Native 0.81, New Architecture, Hermes.

---

## Contents

1. [Concepts you need first](#1-concepts-you-need-first)
2. [One-time setup](#2-one-time-setup)
3. [Daily development](#3-daily-development)
4. [Environment variables](#4-environment-variables)
5. [Building locally](#5-building-locally)
6. [Building in the cloud (EAS Build)](#6-building-in-the-cloud-eas-build)
7. [Signing and credentials](#7-signing-and-credentials)
8. [Version numbers](#8-version-numbers)
9. [OTA updates (EAS Update)](#9-ota-updates-eas-update)
10. [Submitting to the stores](#10-submitting-to-the-stores)
11. [Release checklist](#11-release-checklist)
12. [Troubleshooting](#12-troubleshooting)
13. [Command reference](#13-command-reference)
14. [Files that make this work](#14-files-that-make-this-work)

---

## 1. Concepts you need first

### Expo Go will not work, use the development build

Expo Go is a fixed app from the store. It can only run Expo's own native modules, and this app
uses many that aren't in it (Razorpay, react-native-iap, Google Cast, Facebook SDK, Google
Sign-In, PostHog session replay, …). Opening the project in Expo Go gives a red screen like
`RNDeviceInfo is null`.

Instead we use a **development build**: our own app, with all our native modules, plus Expo's
dev tools. It behaves like Expo Go (scan a QR code, live reload) but it is built from this repo.
Install it once; you only need a new one when native code changes (see
[When do I need a new build?](#when-do-i-need-a-new-build)).

### Build profiles

Defined in `eas.json`. Every `eas build` picks one with `--profile`.

| Profile       | What it is                                             | JS comes from              | Channel       | Signed with                        | Output      |
| ------------- | ------------------------------------------------------ | -------------------------- | ------------- | ---------------------------------- | ----------- |
| `development` | Dev client for daily work                              | Metro on your laptop       | `development` | Android debug keystore             | APK / IPA   |
| `preview`     | Release build for internal testers and OTA testing     | Embedded bundle + OTA      | `preview`     | Android debug keystore (see §7)    | APK / IPA   |
| `production`  | What goes to the Play Store and App Store              | Embedded bundle + OTA      | `production`  | Real upload key / Apple dist cert  | AAB / IPA   |

### Channels

A build is stamped with a **channel** at build time. `eas update --channel preview` only reaches
builds stamped `preview`. That's what stops a test update from reaching store users.

### Environments

EAS stores environment variables in three environments: `development`, `preview`,
`production`. Each build profile and each `update:*` script names the one it uses. See
[§4](#4-environment-variables).

### Runtime version (fingerprint)

An OTA update is JavaScript only. It must run on a binary that has the same native code it was
written against, or the app crashes. `app.json` uses `"runtimeVersion": { "policy":
"fingerprint" }`: Expo hashes everything native (`android/`, `ios/`, native packages in
`node_modules`, native config) into a **runtime version**. A build only accepts updates with
the same runtime version.

So:

- Change only JS/TS/images → same fingerprint → OTA works on existing builds.
- Add/upgrade a native library or touch `android/`/`ios/` → new fingerprint → existing builds
  ignore the update. You need a new store build.

### `__DEV__`

`true` only when JS is served by Metro (`npm start` with a development build, and in Jest).
`false` in preview builds, production builds and **every** OTA update. It answers "am I running
from my laptop?", not "which environment is this?". Use the channel (`Updates.channel` from
`expo-updates`) or an `EXPO_PUBLIC_*` variable for that.

---

## 2. One-time setup

### Tools

```sh
# Node 20+ is required (package.json "engines").
npm install                 # also runs patch-package
npm install -g eas-cli      # the npm scripts call `eas` directly
eas login                   # use the shared tech.bombaycanvas account access
eas whoami                  # confirm
```

`npx eas-cli <command>` works too if you'd rather not install globally. Every `eas` command in
this doc can be written either way.

For **local Android builds**: Android Studio with the Android SDK, and `ANDROID_HOME` set.

For **local iOS builds**: a Mac with Xcode, CocoaPods, then `cd ios && pod install`.

### Your `.env`

Copy `.env.example` to `.env` and fill it in. Only `EXPO_PUBLIC_*` keys reach the app.
See [§4](#4-environment-variables).

### Install the development build on your phone

Either build one yourself (`npm run android`, [§5](#5-building-locally)) or install a cloud one:
expo.dev → **bombay-canvas** → **Builds** → latest `development` build → **Install** (open the
link on the phone, or scan the QR code).

Android won't install it over the **Play Store** version of Canvas: different signing key.
Uninstall the store app first.

---

## 3. Daily development

```sh
npm start          # = expo start --dev-client
```

Then either press `a` (opens on a connected Android device/emulator), or scan the QR code with
the phone's camera, or open the dev build and pick the server from the list. Phone and laptop
must be on the same network. If they can't see each other, `npx expo start --dev-client --tunnel`.

**Do not press `s` ("switch to Expo Go")**. See [§1](#expo-go-will-not-work-use-the-development-build).

Useful keys in the `expo start` terminal:

| Key | Does                                    |
| --- | --------------------------------------- |
| `a` | open on Android                         |
| `i` | open on iOS simulator (Mac only)        |
| `r` | reload the app                          |
| `m` | open the dev menu on the device         |
| `j` | open the JS debugger                    |
| `?` | list all                                |

Shake the phone (or `m`) for the dev menu: reload, performance monitor, element inspector.

### When do I need a new build?

| You changed…                                                       | New build? |
| ------------------------------------------------------------------ | ---------- |
| `.ts`/`.tsx`, styles, images, fonts already linked, API calls       | No. Reload. |
| An `EXPO_PUBLIC_*` value in `.env`                                  | No, but restart with `npx expo start --dev-client --clear`. |
| Added / removed / upgraded a package **with native code**          | **Yes** |
| Anything in `android/` or `ios/`                                   | **Yes** |
| `app.json` native fields (bundle ID, permissions, …)               | **Yes** |
| A pure-JS package (no `android/`/`ios/` folder inside it)          | No |

Not sure if a package is native? Check if `node_modules/<pkg>/android` or `/ios` exists.

### Switching branches

Branches that predate Expo (anything still using `react-native-dotenv`) have different
`node_modules`. After every switch between an Expo and a non-Expo branch:

```sh
npm install
npx expo start --dev-client --clear
```

### Adding a library

```sh
npx expo install <package>      # picks the version that matches SDK 54
```

`npx expo install --check` lists packages whose versions don't match the SDK. Some are
deliberately pinned and excluded under `expo.install.exclude` in `package.json`; leave those.

If the package has native code, you then need a new dev build (and, before release, new store
builds; OTA can't deliver it).

---

## 4. Environment variables

### Rules

- Only variables named `EXPO_PUBLIC_*` reach the app. They are **inlined into the JS bundle at
  build time**, so everyone with the app can read them. **Never put secrets in them.**
- Read them with a static expression only:

  ```ts
  const url = process.env.EXPO_PUBLIC_BASE_URL;          // ✅ inlined
  const { EXPO_PUBLIC_BASE_URL } = process.env;          // ❌ undefined
  const url = process.env[`EXPO_PUBLIC_${name}`];        // ❌ undefined
  ```

- Declare new ones in `src/types/env.d.ts` and add them to `.env.example`.
- `react-native-dotenv` / `import … from '@env'` is gone on this branch.

| Variable                                    | Used for                                      |
| ------------------------------------------- | --------------------------------------------- |
| `EXPO_PUBLIC_BASE_URL`                      | Backend API base URL (**required** in builds) |
| `EXPO_PUBLIC_WEB_CLIENT_ID`                 | Google Sign-In                                |
| `EXPO_PUBLIC_IOS_CLIENT_ID`                 | Google Sign-In on iOS                         |
| `EXPO_PUBLIC_POSTHOG_API_KEY` / `_API_HOST` | PostHog. No key = analytics off              |
| `EXPO_PUBLIC_POSTHOG_*_ENABLED`             | Per-feature PostHog switches (unset = on)     |
| `EXPO_PUBLIC_APPLE_APP_STORE_ID`            | "Update the app" link on iOS                  |
| `EXPO_PUBLIC_DEV_STORE_COUNTRY`             | Dev only: fake the store country              |

### Where values come from

| Running                         | Values come from                                  |
| ------------------------------- | ------------------------------------------------- |
| `npm start`, `expo run:*`       | your local `.env`                                 |
| `eas build --profile X`         | EAS environment named in that profile (`eas.json`) |
| `eas update --environment X`    | EAS environment `X`                               |

EAS **does not** read your `.env` (it's gitignored and isn't uploaded). A cloud build or update
without the EAS variables ships with them `undefined`. `scripts/verify-env.js` runs at the start
of every EAS build and fails it if `EXPO_PUBLIC_BASE_URL` is missing, or if a **production**
build points at a dev backend (ngrok, localhost, LAN IPs, `:5050`).

### Managing EAS variables

```sh
# Create (repeat --environment to set the same value in several)
eas env:create --environment preview --visibility plaintext \
  --name EXPO_PUBLIC_BASE_URL --value "https://…"

eas env:list --environment preview          # see what's set
eas env:update --environment preview --variable-name EXPO_PUBLIC_BASE_URL --value "https://…"
eas env:delete --environment preview --variable-name EXPO_PUBLIC_BASE_URL
eas env:pull --environment preview          # write them to .env.local to reproduce a build locally
```

Or use expo.dev → project → **Environment variables**. Use `plaintext` visibility for
`EXPO_PUBLIC_*`, since they are public anyway.

`production` must point at the production backend. `preview` normally points at the dev/staging
backend.

---

## 5. Building locally

Local builds are free and unlimited; cloud builds count against the EAS plan's monthly quota.
Use local builds for day-to-day native changes and cloud builds for iOS, OTA tests and releases.

### Android dev build: `npm run android`

```sh
npm run android                     # = expo run:android
npx expo run:android --device       # pick a specific connected device
```

Builds the debug variant with Gradle, installs it on the connected phone/emulator, and starts
Metro. Equivalent to the development profile, without using a cloud build. Uses `.env`.

### Android release build locally

```sh
npx expo run:android --variant release
```

Signs with **your** upload key, read from `~/.gradle/gradle.properties`:

```properties
MYAPP_UPLOAD_STORE_FILE=D:/path/to/my-upload-key.keystore
MYAPP_UPLOAD_STORE_PASSWORD=…
MYAPP_UPLOAD_KEY_ALIAS=…
MYAPP_UPLOAD_KEY_PASSWORD=…
```

These were removed from the repo; keep them in your home folder, never in `android/gradle.properties`.

This build has **no channel**, so it won't receive `preview`/`production` OTA updates. To test
OTA, use a preview build from EAS (cloud or `--local`).

Plain Gradle still works for a bundle you'd upload by hand:

```sh
cd android
./gradlew bundleRelease      # → android/app/build/outputs/bundle/release/app-release.aab
```

### iOS (Mac only)

```sh
cd ios && pod install && cd ..
npm run ios                              # = expo run:ios, simulator
npx expo run:ios --device                # a connected iPhone
npx expo run:ios --configuration Release
```

The fastlane `beta` lane in [TESTFLIGHT.md](./TESTFLIGHT.md) still works during the transition.

### `eas build --local`: the EAS pipeline on your machine

```sh
eas build --local -p android --profile preview
```

Runs exactly what the cloud build runs (profile, channel, EAS env vars, credentials), but on
your machine, so it doesn't use the quota. Output file lands in the project folder.

- Android: Linux or macOS. **On Windows, run it inside WSL** (with Node, Java 17 and the
  Android SDK installed in WSL).
- iOS: macOS with Xcode and fastlane.

### Never run `expo prebuild` here

`npx expo prebuild` regenerates `android/` and `ios/` from `app.json` and would wipe our custom
native code (Cast setup, AVAudioSession, MainActivity workarounds, entitlements). If you need to
see what Expo would generate, do it in a throwaway copy of the repo.

---

## 6. Building in the cloud (EAS Build)

```sh
eas build -p android --profile development
eas build -p ios     --profile development
eas build -p android --profile preview
eas build -p all     --profile preview        # both platforms
npm run build:android                         # production, Android
npm run build:ios                             # production, iOS
```

Flags worth knowing:

| Flag                  | Does                                                       |
| --------------------- | ---------------------------------------------------------- |
| `--no-wait`           | upload and return; watch progress on expo.dev               |
| `--message "…"`       | label shown on the build page                              |
| `--clear-cache`       | ignore cached dependencies (try when a build fails oddly)  |
| `--non-interactive`   | never prompt (CI). Fails instead of asking.                |
| `--local`             | build on this machine, see [§5](#eas-build---local-the-eas-pipeline-on-your-machine) |

What happens:

1. EAS CLI packs the project (everything **not** gitignored, including uncommitted changes) and
   uploads it.
2. A cloud machine runs `npm install`, then our `eas-build-pre-install` hook
   (`scripts/verify-env.js`), then Gradle / Xcode.
3. The build appears at expo.dev → **Builds**, with logs, the runtime version, and an
   **Install** link / QR code (internal builds) or a download (store builds).

Other build commands:

```sh
eas build:list                   # recent builds
eas build:view <id>              # one build's details
eas build:cancel <id>
eas build:resign                 # re-sign an existing iOS build (e.g. after adding a device)
```

### iOS internal builds need registered devices

`development` and `preview` iOS builds are ad hoc builds. They only install on iPhones listed in
the provisioning profile. Register each tester's phone once:

```sh
eas device:create      # gives a link/QR; open it on the iPhone and install the profile
eas device:list
```

Then build (or `eas build:resign`) so the new device is in the profile.

### Quota

The plan includes a monthly number of cloud builds. Don't spend them on things a reload or a
local build can do:

- JS-only changes → no build at all.
- Native changes during development → `npm run android` locally; share one cloud dev build with
  the team instead of each person building.
- Cloud builds → iOS (no Mac), preview builds for OTA tests, production releases.

Don't create extra Expo accounts to get more free builds: it's against Expo's terms, and the
project, credentials and update history belong to `tech.bombaycanvas`.

---

## 7. Signing and credentials

### Android

| Profile       | Signing                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| `development` | `withoutCredentials`: Gradle's debug config → `android/app/debug.keystore` (public RN key) |
| `preview`     | `withoutCredentials` + `ORG_GRADLE_PROJECT_MYAPP_*` env in `eas.json` point release signing at the same debug keystore |
| `production`  | Upload keystore stored on EAS                                                               |

The real upload keystore is gitignored, so it is **never** uploaded with the project. Preview
APKs are debug-signed. Fine for testers, rejected by Play, and they can't install over the store
app.

**Before the first production EAS build**, upload the *existing* upload key once:

```sh
eas credentials -p android
# → production → Keystore → Set up a new keystore → upload an existing keystore
# give it the .keystore file, alias, store password, key password
```

> ⚠️ **Never let EAS "Generate a new Android Keystore" for `com.bombaycanvas`.** Play only accepts
> uploads signed with the registered upload key. If the prompt ever appears, answer **No** and stop.

### iOS

```sh
eas credentials -p ios
```

Sign in with the Apple account (or App Store Connect API key) for team `UKWJKZWBXY`. EAS can
create and store the distribution certificate and provisioning profiles for
`com.bombaycanvas.app1`. Profiles must include the **Sign in with Apple** capability.

- Don't revoke an existing distribution certificate unless you know nothing else (fastlane, a
  teammate's Mac) still uses it.
- If asked for a `.p12`, it's the exported distribution certificate + its password. If you don't
  have one, let EAS generate a new certificate (Apple allows a few per team) instead.

---

## 8. Version numbers

Two numbers per platform:

| | User-facing version | Build number |
| --- | --- | --- |
| Android | `versionName` in `android/app/build.gradle` | `versionCode` |
| iOS | `MARKETING_VERSION` in Xcode | `CURRENT_PROJECT_VERSION` |
| Who changes it | **you**, in the native files, per release | **EAS**, automatically |

`eas.json` has `"appVersionSource": "remote"` and the production profile has
`"autoIncrement": true`. EAS keeps the build number on its servers and bumps it on every
production build. The `versionCode` in `build.gradle` is ignored by EAS builds.

```sh
eas build:version:get -p android
eas build:version:set -p android     # interactive; enter the LAST number used on the store
eas build:version:get -p ios
eas build:version:set -p ios
```

If a build was uploaded outside EAS (Gradle, fastlane), set the EAS number to match it before
the next EAS production build, or the store rejects the upload as a duplicate.

To release a new user-facing version (e.g. 1.1.16 → 1.1.17), edit `versionName` /
`MARKETING_VERSION`, commit, then build. Changing these doesn't change the fingerprint.

---

## 9. OTA updates (EAS Update)

### How it works on the phone

`expo-updates` is configured (Android manifest / `ios/bombaycanvas/Supporting/Expo.plist`) to
**check on every launch** and **not wait** for the download:

1. Launch 1 after you publish: app starts with the JS it already has, downloads the update in
   the background.
2. Launch 2 (after fully closing the app): runs the new JS.

So testers must **close the app completely and reopen it twice**.

A build only takes updates that match both its **channel** and its **runtime version**.

### Publishing

```sh
npm run update:preview -- --message "Fix typo on settings"
npm run update:prod    -- --message "Fix typo on settings"
```

These run `eas update --channel <x> --environment <x>`. The CLI bundles the JS for Android and
iOS, computes the runtime version locally, and uploads. Takes a minute or two. No store review.

Only one platform: add `--platform android` (or `ios`).

### Test an update before production

1. Build a preview build **without** the change: `eas build -p android --profile preview`.
2. Install it (expo.dev → Builds → **Install**), open it once.
3. Make the change, then `npm run update:preview -- --message "…"`.
4. Close the app fully, open, close, open. The change is there.
5. When happy, `npm run update:prod -- --message "…"` from the same commit.

You can also load any published update in a **development build**: dev menu → Extensions /
EAS Update, or open the update's QR code from expo.dev.

### Inspecting and undoing

```sh
eas update:list                       # recent updates per branch
eas update:view <group-id>            # details of one update
eas channel:list                      # which branch each channel serves
eas channel:view production
eas update:republish --group <id>     # re-publish an older, good update → it becomes the latest
eas update:rollback                   # interactive rollback (published update or embedded bundle)
eas update:delete <group-id>
```

**Rollback = republish the last good update** (or roll back to the embedded bundle). Phones pick
it up on their next two launches, exactly like a normal update.

### What can and can't go out OTA

| OK over OTA                                     | Needs a store build                                  |
| ----------------------------------------------- | ---------------------------------------------------- |
| Bug fixes in JS/TS                              | New/upgraded native library                          |
| Copy, layout, styles, images bundled in JS      | Anything in `android/` / `ios/`                      |
| Changes to existing screens and flows           | Permissions, app icon, splash, bundle ID             |
| `EXPO_PUBLIC_*` value changes (re-publish)      | Version name / build number                          |

Store policy: Apple and Google allow OTA JS updates that **don't change the app's purpose or
add review-worthy features**. **Don't change payment behaviour (Razorpay vs in-app purchase,
pricing rules) over OTA.** Ship those as store builds.

OTA reaches only users on a store build that contains `expo-updates`, i.e. builds made after
this migration.

### Checking the runtime version

```sh
npx expo-updates runtimeversion:resolve --platform android
npx expo-updates runtimeversion:resolve --platform ios
```

Compare with the runtime version on the build's page. If they differ, the update won't apply.
See [Troubleshooting](#runtime-version-mismatch).

---

## 10. Submitting to the stores

```sh
npm run submit:android    # = eas submit -p android --profile production
npm run submit:ios        # = eas submit -p ios --profile production
eas build -p android --profile production --auto-submit   # build + submit in one go
```

- **Android** uploads to the Play **internal** track (`eas.json` → `submit.production.android.track`).
  Needs a Google Play service-account JSON uploaded to EAS (`eas credentials` → Android →
  Google Service Account). Promote to production in the Play Console.
- **iOS** uploads to App Store Connect / TestFlight. Needs the App Store Connect API key in EAS
  credentials (`eas credentials -p ios` → App Store Connect API key). Submitting for review stays
  manual in App Store Connect.

Not yet configured: service account and ASC key in EAS. Until they are, download the build from
expo.dev and upload by hand, or use fastlane for iOS.

---

## 11. Release checklist

**Store release**

1. Bump `versionName` (Android) / `MARKETING_VERSION` (iOS) if this is a new user-facing version.
2. `eas build:version:get` on both platforms matches the last number on the stores.
3. `eas env:list --environment production`: `EXPO_PUBLIC_BASE_URL` is the production backend.
4. `npm run lint`, `npx tsc --noEmit`, `npm test`.
5. `npm run build:android` / `npm run build:ios`.
6. Submit, test from Play internal track / TestFlight, roll out (staged on Play, phased on iOS).

**OTA release**

1. Confirm the change is JS-only (no native package/file changes since the store build).
2. Publish to `preview`, test on a preview build.
3. Publish the same commit to `production`.
4. Watch PostHog / crash reports; republish the previous update if something breaks.

---

## 12. Troubleshooting

### Red screen `RNDeviceInfo is null` / "TurboModule … not found"
You opened the project in **Expo Go**. Use the development build.

### `Cannot find module 'babel-preset-expo'` (Jest or Metro)
`node_modules` is from a non-Expo branch. `npm install`.

### An `EXPO_PUBLIC_*` value is `undefined`
- Not a static `process.env.EXPO_PUBLIC_X` read (see [§4](#rules)).
- Changed `.env` without clearing the cache: `npx expo start --dev-client --clear`.
- Cloud build/update: variable missing from that EAS environment (`eas env:list --environment …`).

### Runtime version mismatch
The update was published with a different fingerprint than the build has. Causes we have hit:

- **Line endings.** Windows checkouts with CRLF change the hash of files like `gradlew`.
  `.gitattributes` forces LF. If your checkout predates it, renormalise **after committing or
  stashing your work**: `git rm -r --cached -q . && git reset --hard -q`.
- **Machine-specific files** in native folders (build output, keystores). Add them to
  `.fingerprintignore` if they don't affect the native code.
- A real native change since the build. Make a new build.

### EAS build fails at "verify-env"
`EXPO_PUBLIC_BASE_URL` isn't set for that profile's environment, or a production build points at
a dev URL. Fix with `eas env:create` / `eas env:update`.

### EAS asks to generate a keystore
Answer **No**. See [§7](#android).

### `strings.xml` / `AndroidManifest.xml` changed after `eas build`
EAS rewrites them on every build (formatting, expo-updates entries). Keep values in
`strings.xml` on a single line. Multi-line values get mangled.

### Update published but the app doesn't change
- Close the app fully and open it **twice**.
- Installed build is on a different channel (a dev build, a local release build, or a store
  build from before the migration).
- Runtime version mismatch (above).

---

## 13. Command reference

### npm scripts

| Script                    | Runs                                                            |
| ------------------------- | --------------------------------------------------------------- |
| `npm start`               | `expo start --dev-client`                                       |
| `npm run android`         | `expo run:android`: local debug build + install + Metro         |
| `npm run ios`             | `expo run:ios` (Mac)                                            |
| `npm run build:android`   | `eas build --platform android --profile production`             |
| `npm run build:ios`       | `eas build --platform ios --profile production`                 |
| `npm run submit:android`  | `eas submit --platform android --profile production`            |
| `npm run submit:ios`      | `eas submit --platform ios --profile production`                |
| `npm run update:preview`  | `eas update --channel preview --environment preview`            |
| `npm run update:prod`     | `eas update --channel production --environment production`      |
| `npm test` / `npm run lint` | Jest / ESLint                                                 |

### Expo CLI (`npx expo …`)

| Command                                 | Does                                                      |
| --------------------------------------- | --------------------------------------------------------- |
| `expo start --dev-client`               | dev server for the development build                      |
| `expo start --dev-client --clear`       | same, clearing Metro's cache                              |
| `expo start --dev-client --tunnel`      | when phone and laptop are on different networks           |
| `expo start --no-dev --minify`          | serve a production-like bundle (`__DEV__` = false)         |
| `expo run:android [--variant release] [--device]` | local Android build and install                  |
| `expo run:ios [--configuration Release] [--device]` | local iOS build (Mac)                          |
| `expo install <pkg>`                    | add a package at the SDK-compatible version               |
| `expo install --check` / `--fix`        | list / fix SDK version mismatches                         |
| `expo export`                           | build the JS bundles to `dist/` (what `eas update` uploads) |
| `expo config`                           | print the resolved app config                             |
| `npx expo-doctor`                       | health check of the project setup                         |
| `npx expo-updates runtimeversion:resolve --platform <p>` | print the runtime version (fingerprint)  |
| ~~`expo prebuild`~~                     | **don't**. Regenerates native folders.                    |

### EAS CLI (`eas …` or `npx eas-cli …`)

| Area        | Commands                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------ |
| Account     | `login`, `logout`, `whoami`                                                                |
| Project     | `project:info`, `init` (already done)                                                      |
| Build       | `build`, `build --local`, `build:list`, `build:view`, `build:cancel`, `build:resign`       |
| Versions    | `build:version:get`, `build:version:set`                                                   |
| Env vars    | `env:list`, `env:create`, `env:update`, `env:delete`, `env:pull`                           |
| Credentials | `credentials` (interactive, per platform)                                                  |
| Devices     | `device:create`, `device:list`, `device:delete` (iOS ad hoc)                               |
| Update      | `update`, `update:list`, `update:view`, `update:republish`, `update:rollback`, `update:delete` |
| Channels    | `channel:list`, `channel:view`, `channel:create`, `channel:edit`                           |
| Submit      | `submit`                                                                                   |
| Help        | `eas <command> --help` for every flag                                                      |

---

## 14. Files that make this work

| File                                   | Role                                                              |
| -------------------------------------- | ----------------------------------------------------------------- |
| `app.json` → `expo`                    | Expo config: names, IDs, owner, runtime version policy, updates URL |
| `eas.json`                             | Build profiles, channels, environments, versioning, submit config |
| `scripts/verify-env.js`                | Fails EAS builds with a missing or dev backend URL                 |
| `.fingerprintignore`                   | Files excluded from the runtime version hash                      |
| `.gitattributes`                       | LF line endings, so fingerprints match across machines            |
| `src/types/env.d.ts`, `.env.example`   | The list of `EXPO_PUBLIC_*` variables                             |
| `babel.config.js`, `metro.config.js`   | `babel-preset-expo` and Expo's Metro config                       |
| `react-native.config.js`               | Fonts, and opts Reanimated out of autolinking                     |
| `android/app/src/main/AndroidManifest.xml`, `res/values/strings.xml` | expo-updates settings and runtime version (Android) |
| `ios/bombaycanvas/Supporting/Expo.plist` | expo-updates settings (iOS)                                     |
| `MainApplication.kt`, `MainActivity.kt`, `AppDelegate.swift` | Native entry points wrapped for Expo modules  |
