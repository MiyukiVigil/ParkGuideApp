# 🌿 SFC Guide Portal - Setup Guide

### 1. Installation
Because the project uses **React 19**, you must bypass peer dependency conflicts to ensure `react-native-paper` and `expo-router` install correctly.

```bash
# Install dependencies
npm install --legacy-peer-deps
```

### 2. Startup

```bash
# Start the dev server
npx expo start
# or
npm start
```

### Note
Currently on this branch, this build requires development build of the app for it to work
```bash
npx expo prebuild
```

### 3. iOS Development Build

After prebuilding, install CocoaPods dependencies:

```bash
cd ios
pod install
cd ..
```

Run the app on an iOS simulator or connected device:

```bash
npx expo run:ios
```

### 4. Android Development Build

Run the app on an Android emulator or connected device:

```bash
npx expo run:android
```

### Notes

- These commands generate a development build necessary for native modules like `react-native-pdf` or WebView enhancements.
- Expo Go cannot run features that require native modules. You must use development builds for full functionality.
