# Loudify — Volume Booster

A minimal, premium Android/iOS volume booster utility app built with React Native + Expo. Opens as a floating bottom sheet overlay — no full-screen UI, no clutter. Just instant loudness control.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: React Native + Expo (SDK 53)
- Fonts: Poppins (UI) + Inter (system)
- Notifications: expo-notifications
- Blur: expo-blur
- Volume control: react-native-volume-manager (real device system volume)
- State: React Context + AsyncStorage
- Build: EAS Build (Expo Application Services)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM

## Where things live

- `artifacts/mobile/` — Expo mobile app (the main product)
  - `app/(tabs)/index.tsx` — entry screen (transparent background, auto-opens bottom sheet)
  - `components/EQBottomSheet.tsx` — the entire UI (floating volume control sheet, 44px touch sliders)
  - `components/VerticalSlider.tsx` — custom vertical slider (currently unused, kept for reference)
  - `plugins/withTransparentActivity.js` — Expo config plugin that makes the Android activity translucent
  - `context/AudioContext.tsx` — global audio state (volume, boost, device, active)
  - `utils/notifications.ts` — system notification helpers
  - `eas.json` — EAS build profiles (development / preview APK / production AAB)
  - `app.json` — full Expo + Android + iOS config

## Building for Play Store

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Log in to Expo
```bash
eas login
```

### 3. Link project to EAS (run once)
```bash
cd artifacts/mobile
eas init
```
Replace `REPLACE_WITH_YOUR_EAS_PROJECT_ID` in `app.json` with the generated ID.

### 4. Build preview APK (for testing on device)
```bash
cd artifacts/mobile
eas build --profile preview --platform android
```

### 5. Build production AAB (for Play Store)
```bash
cd artifacts/mobile
eas build --profile production --platform android
```

### 6. Submit to Play Store
```bash
eas submit --platform android
```
Requires a `google-service-account.json` (Google Play service account key) in `artifacts/mobile/`.

## Android Permissions declared

| Permission | Reason |
|---|---|
| `MODIFY_AUDIO_SETTINGS` | Core volume boost functionality |
| `POST_NOTIFICATIONS` | Show boost-active persistent notification |
| `FOREGROUND_SERVICE` | Keep boost alive when app is backgrounded |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Media stream compatibility |
| `VIBRATE` | Haptic feedback on interactions |
| `INTERNET` | Advertisement network |
| `RECEIVE_BOOT_COMPLETED` | Restore boost state on device restart |

## App Features

- Floating bottom sheet UI — no full-screen homepage
- Volume slider — controls system media volume
- Booster slider — amplifies audio output
- Live "Boost Active" badge when boost > 0%
- System notification fires when boost is active
- Blurred backdrop (frosted glass on device)
- Animated sliders — expand on touch, shrink on release
- Settings persist across sessions (AsyncStorage)
- Ad placeholder (bottom of sheet — ready for AdMob)

## Play Store Listing Notes

- Category: Tools / Utilities
- Content Rating: Everyone
- Target Android: 8.0+ (API 26+)
- Permissions justification: All permissions directly relate to audio management; no sensitive data collected

## Architecture Decisions

- Overlay-first design: the app IS the bottom sheet — no navigation stack, no tabs visible
- No account system, no cloud sync, no analytics
- Boost state stored locally only (AsyncStorage)
- Notification is a local scheduled notification (not push), no FCM token required for core functionality

## User Preferences

- Keep UI minimal — no labels, toggles, or settings that aren't essential
- Poppins Bold for headings, Inter for body text
- Dark theme only (#0d0d0d background, #ff3b30 red accent)
- No save buttons — all changes apply instantly

## Gotchas

- `expo-blur` BlurView does not render on web — falls back to transparent. Works correctly in Expo Go and production builds.
- `useNativeDriver` animations are JS-driven on web — no impact on device performance.
- `google-services.json` is required for Android production builds even if FCM is not used (Expo expects it for the notifications plugin). Generate one from Firebase Console (no need to enable FCM).
- Replace `REPLACE_WITH_YOUR_EAS_PROJECT_ID` in `app.json` after running `eas init`.
