// Runs on EAS Build (eas-build-pre-install). EXPO_PUBLIC_* values are inlined
// into the bundle, so a missing or dev backend URL would ship silently — fail
// the build instead. Same guard the fastlane `beta` lane applies to archives.
const DEV_BACKEND = /ngrok|localhost|127\.0\.0\.1|192\.168\.|10\.0\.2\.2|:5050/;

const profile = process.env.EAS_BUILD_PROFILE;
const baseUrl = (process.env.EXPO_PUBLIC_BASE_URL || '').trim();

const fail = message => {
  console.error(`verify-env: ${message}`);
  process.exit(1);
};

// Development builds load JS from the local Metro server, not the build.
if (profile === 'development') {
  process.exit(0);
}
if (!baseUrl) {
  fail(`EXPO_PUBLIC_BASE_URL is not set for the "${profile}" profile.`);
}
if (profile === 'production' && DEV_BACKEND.test(baseUrl)) {
  fail(`production build points at a dev backend: ${baseUrl}`);
}
console.log(`verify-env: ${profile} -> ${baseUrl}`);
