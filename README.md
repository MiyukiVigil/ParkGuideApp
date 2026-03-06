# 🌿 SFC Guide Portal - Setup Guide

### 1. Installation
Because the project uses **React 19**, you must bypass peer dependency conflicts to ensure `react-native-paper` and `expo-router` install correctly.

```bash
# Navigate to project
cd park-guide-app

# Install dependencies
npm install --legacy-peer-deps
```

### 2. Startup
The app uses Expo Router v3. Always clear the Metro cache when starting to ensure the file-based routes are mapped correctly.

```bash
# Start the dev server
npx expo start
# or
npm start
```
