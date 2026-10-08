# Grobaax — Android & iOS Packaging Guide

This guide details the single-codebase packaging architecture for **Grobaax** across:
1. **Google Play Store (Android)** — `.apk` (Testing) & `.aab` (Play Store Submission)
2. **Apple App Store (iOS)** — Xcode Archive & TestFlight / App Store Connect
3. **Web Browser & PWA** — https://www.grobaax.com/

---

## 1. Single Codebase Architecture

```
                         GROBAAX
                    Single Web Engine
                  https://www.grobaax.com/
                              |
              ┌───────────────┼───────────────┐
              |               |               |
         Web Browser       Android           iOS
              |               |               |
          Modern PWA     Google Play      Apple App Store
              |               |               |
        PWA Prompts ON   PWA Prompts OFF  PWA Prompts OFF
```

- **Single Truth**: The existing Grobaax interface, layout, navigation, features, Firebase Firestore database, and authentication are identical across Web, Android, and iOS.
- **Dynamic Platform Detection**: `src/utils/platformDetection.ts` cleanly detects native container environments (`isAndroidApp()`, `isIOSApp()`, `isPackagedApp()`).
- **PWA Experience**:
  - In normal web browsers (Chrome, Safari, Firefox), PWA install prompts and guides remain available.
  - When running inside the packaged Android (`.apk` / `.aab`) or iOS app, PWA installation prompts, buttons, and banners are automatically hidden.

---

## 2. Generating Android APK and AAB

The Android project is located in `/android` and is managed with Gradle.

### Step 1: Build & Sync Web Assets
```bash
npm run mobile:sync
```
*(Or `npm run build && npx cap sync android`)*

### Step 2: Build Android APK (for direct testing)
```bash
cd android
./gradlew assembleDebug
```
- **Output APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- You can install this directly onto an Android device or emulator via:
  ```bash
  adb install android/app/build/outputs/apk/debug/app-debug.apk
  ```

### Step 3: Build Android App Bundle (.aab) (for Google Play Console)
```bash
cd android
./gradlew bundleRelease
```
- **Output AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- Upload this `.aab` file directly to the **Google Play Console** under Production / Open Testing / Internal Testing.

### Step 4: Signing Configuration (Optional)
To sign your release builds automatically, define your keystore properties in `android/gradle.properties` or environment variables:
```properties
GROBAAX_RELEASE_STORE_FILE=my-release-key.jks
GROBAAX_RELEASE_STORE_PASSWORD=your-password
GROBAAX_RELEASE_KEY_ALIAS=my-key-alias
GROBAAX_RELEASE_KEY_PASSWORD=your-password
```
Or run:
```bash
./gradlew assembleRelease
```
to generate a signed release APK.

---

## 3. Generating iOS App Store Package

The iOS project is located in `/ios` and configured for Xcode.

### Step 1: Build & Sync Web Assets
```bash
npm run mobile:sync
```
*(Or `npm run build && npx cap sync ios`)*

### Step 2: Open in Xcode
```bash
npx cap open ios
```
- Select your Apple Developer Team in **Signing & Capabilities**.
- Choose **Product > Archive**.
- Click **Distribute App** to upload to **TestFlight** and the **Apple App Store**.

### Configured Capabilities & Privacy
- **Bundle Identifier**: `com.grobaax.app`
- **Deployment Target**: iOS 14.0+
- **Privacy Keys**: `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` configured for Student ID verification, profile pictures, and marketplace photos.

---

## 4. Web & PWA Verification

- **Production URL**: `https://www.grobaax.com/`
- Full Web App Manifest located at `public/manifest.json` and generated via `vite-plugin-pwa`.
- Browser users visiting in Chrome or Safari continue to receive full PWA installability and offline support.
