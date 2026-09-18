fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios status

```sh
[bundle exec] fastlane ios status
```

Show what is currently on TestFlight

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload a new build to TestFlight

### ios upload_archive

```sh
[bundle exec] fastlane ios upload_archive
```

Export + upload an already-built .xcarchive (skips the ~15min rebuild)

### ios verify_archive

```sh
[bundle exec] fastlane ios verify_archive
```

Check an archive's baked-in backend URL without uploading

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
