# Setwise · Thoughtful training

An iPhone-focused, dark-mode fitness PWA with offline workout logging, planning and explainable progression. Records stay in compressed local storage on your phone/browser. Core use requires no database service, account, subscription, provider key or Apple Developer membership.

This repository contains the working web application and a generated Capacitor iOS source project at `ios/App/App.xcodeproj`, using Swift Package Manager with the web bundle copied into it. The GitHub Pages workflow targets [Setwise](https://ryxclan81.github.io/GYMSomething/); see [hosting setup](docs/HOSTING.md). The native source still needs a Mac/Xcode build and signing. The implementation coverage and remaining requirements are recorded in [FEATURE_MATRIX.md](FEATURE_MATRIX.md).

The checked static build is `dist/`. After building and running `ios:sync`, `scripts/package-delivery.py` generates local `releases/setwise-web.zip`, `releases/setwise-ios-source.zip` and their checksums. Generated archives, local records, caches and test traces are excluded from this source repository.

## Run locally

Use **Node.js 24 LTS (24.0 or newer within 24.x)**. This satisfies the installed tools and the scanner library's Node requirement; Node 22 is insufficient for the current dependency tree. In this project directory:

```sh
npm install
npm run dev
```

Open [Setwise](http://127.0.0.1:5173). Alternatively, use the included pnpm lockfile:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For a production build:

```sh
npm run build
npm run preview
```

`dist/` is the static deployment artifact. The preview server prints its local URL. No secrets are needed in `.env`; never embed API keys in `VITE_*` variables.

## What works

- A welcome screen followed by five-step optional onboarding with quick defaults, visible grouped preferences, optional bodyweight and cm or feet/inches height, and multiple editable equipment inventories.
- A bundled 728-exercise library with real source instructions, typo-tolerant search/filters/favorites, custom exercises/media and attribution.
- Day-first Home and Train views listing every actual scheduled workout, selectable upcoming dates and clear rest/empty states; a separate Workout library supports unscheduled starts.
- Fifteen base starter workouts, nine multiweek programs, dated application previews, keep/replace plan choices, optional weekly phases with separate editable targets, rest days and equipment substitutions.
- Today's exercise overview and focused exercise logging with primary/secondary muscles, targets, prior values, effort/notes, history edits, rest timers, persistent hold timers and interrupted-session recovery. Set categories remain available in secondary actions.
- Saved-data trends, personal records, muscle-set analysis, configurable progression decisions, goals, body measurements, weekly streaks and optional milestones. Weight goals offer editable rate/weeks/date estimates, fixed manual deadlines and first reached dates from recorded history.
- A visible Nutrition destination with explicit enablement, 905 sourced offline USDA foods, manual/cached foods, diary portions, recipes/saved meals, macros/water and paginated Open Food Facts lookup.
- Full JSON backup/validated restore, CSV exports, data deletion and cross-tab storage conflict protection.
- Evergreen dark surfaces with Sage, Sky blue, Soft violet or Neutral accents and Comfortable/Compact spacing in Settings → Appearance. The mobile navigation reserves its own row so it cannot cover scrolling content.
- A 22-icon workout picker, newest-first saved workouts with alternate sorts, and permanent template deletion that preserves recorded session snapshots.

New installations start without fabricated completed workouts or statistics. Onboarding offers an optional two-week starter calendar using Automatic or a selected workout preset; these are editable planned entries. Program application preserves recorded/skipped/session-linked entries and explicit rest days. Equipment inventories and nutrient targets are editable examples. Training recommendations and time estimates use transparent configurable assumptions, not diagnoses or guaranteed outcomes.

## Install on iPhone

Deploy `dist/` to a stable **HTTPS** site using its configured base path, then open that URL in **Safari**. Use **Share → Add to Home Screen**, choose **Open as Web App** if offered, and tap **Add**. Launch from the Home Screen and allow offline preparation before relying on airplane-mode use. Apple's [Safari installation instructions](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios) describe the current menu.

The installed PWA needs no seven-day native signing renewal. Browser/device storage can still be cleared. A PC's plain HTTP LAN development preview is not the production installation route; `127.0.0.1` on the phone refers to the phone. [DEPLOYMENT.md](DEPLOYMENT.md) covers HTTPS hosting, offline checks, storage transfer and building the generated native project on Mac/Xcode.

Physical iPhone Safari installation, camera/speech services and native builds remain untested in this Windows environment. Browser/mobile viewport and offline results are reported precisely in [TEST_REPORT.md](TEST_REPORT.md).

## Optional integrations

Nutrition, AI, voice and Spotify are disabled initially. The Nutrition tab remains visible and offers an explicit enable action. Manual workouts and calculations do not depend on optional services.

- **Food lookup:** Open Food Facts live requests plus cached/manual fallback and a bundled USDA generic-food catalog; see [food attribution](FOOD_ATTRIBUTION.md). Product coverage and label completeness vary. Public deployment needs Open Food Facts registration/identification terms satisfied; a proxy may be needed to set the required custom User-Agent.
- **Camera/voice:** Feature-detected browser adapters with typed/manual fallbacks. Actual device permissions and browser services determine availability.
- **AI:** A consent-aware secure endpoint adapter; no configured provider/backend, shared key or paid fallback. Enabling the switch alone does not supply an AI model.
- **Spotify:** PKCE and Premium active-device playback controls require your developer app, registered redirect and permitted user. Open Spotify remains available without credentials.
- **Reminders:** In-app reminders and calendar `.ics` export. Guaranteed background delivery needs separate native/push infrastructure.

See [INTEGRATIONS.md](INTEGRATIONS.md) for contracts, sources, credential requirements and restrictions. HealthKit, Watch, Siri, Live Activities, Foundation Models and automatic rep counting are future work.

## Keep a backup

Open **Settings → Backup & data → Download full JSON backup** and keep the file privately outside the browser/device containing your only records. The same panel restores validated JSON after typed `RESTORE` confirmation. A restore replaces current phone-local records; export first. CSV files are for analysis and do not restore the complete app. Custom media is included in JSON and can increase backup size; the file picker has a 20 MB limit.

Local storage has a device/browser quota. Large custom media or growing histories can fill it; failed saves display an error and keep unsaved edits available for recovery export. Compression saves space and does not encrypt records. Changing origin, browser or device can create separate storage. Existing records from an older IndexedDB version migrate through a validated read-only path and remain untouched there until explicit reset. No cloud sync or account recovery is provided. See [DATA_MODEL.md](DATA_MODEL.md) and [PRIVACY.md](PRIVACY.md).

## Check the application

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Exact executed commands, passed/failed checks, browser coverage, offline verification and retained artifacts are in [TEST_REPORT.md](TEST_REPORT.md). These checks establish software behavior; they do not scientifically validate a training protocol or replace physical-device testing.

## Change log

### 1.4.1 · 12 October 2026

- Put No equipment first in onboarding and equipment editing. It clears and disables other equipment choices until unchecked.
- Added a 700 ms hover-help delay, canceled pending help when leaving a control, and made passive explanations click-through. Explicit help and keyboard explanations remain available.
- Completing an exercise's final set returns to the exercise overview with rest and logged values preserved. Saving a new session returns to Today's workout selection; its summary is available through Review saved workout.

### 1.4.0 · 12 October 2026

- Added a welcome screen with Get started, a clickable Home logo and a simpler mobile header. Changed the palette to evergreen and sage, opened up spacing, and reserved a real layout row for bottom navigation.
- Added 22 selectable workout icons, newest-first sorting and permanent deletion with preserved logged history and active-session snapshots.
- Improved equipment adaptation with ranked compatible alternatives and an explicit skip option; typo-tolerant searches find pushups and sit-ups.
- Added persisted countdown/stopwatch controls for timed exercises; set categories are available through secondary actions.
- Added 905 offline USDA foods and support for newer Open Food Facts nutrition responses, more search results, barcode variants and saved-food reuse.

### 1.3.0 · 11 October 2026

- Renamed the app Setwise with an original geometric S mark across the app, Home Screen icons and native assets. Existing saved records and backup compatibility are preserved.
- Increased selected switch contrast and replaced browser-default checkboxes with clear, custom checked and focus states.
- Added muscle-target workout icons based on exercise metadata, plus beginner explanations with hover, keyboard and tap-based Help mode.
- Added project-path-aware GitHub Pages hosting and a verified build/deploy workflow; see [hosting setup](docs/HOSTING.md).

### 1.2.0 · 11 October 2026

- Made Home and Train day-first: all actual workouts, rest/empty states, status actions and upcoming dates, with a separate Workout library.
- Opened optional setup preferences and added feet/inches height entry alongside metric units; canonical cm survives unit switching and is editable in Settings.
- Connected starter preset selection and program Use to actual calendar application, with dated previews, keep/replace choices and protection for recorded/rest/skipped entries.
- Added optional weekly phases and frozen, editable rep/set/load target variants while preserving original workouts and session history.
- Added editable weight-goal rate/duration/date estimates, fixed manual deadlines and first reached dates from recorded goal history.
- Refined the graphite/steel-blue palette, added local accent/spacing preferences, replaced the nutrition ring with actual values/native progress and collapsed optional milestone details.

### 1.1.0 · 11 October 2026

- Replaced current database persistence with compact, compressed phone-local storage; retained full readable backups, recovery controls and safe read-only migration of older records.
- Expanded optional onboarding to five stages with defaults/skipping, body measurements, training preferences, equipment, optional tools and review.
- Added today's movement overview and focused exercise logging with muscle labels, clear targets and saved focus on reload.
- Standardized custom selection menus and editable number fields so zero can be cleared and replaced.
- Made Nutrition visible with explicit enablement while retaining diary, custom-food, recipe, portion, water and export functions.

Development continues against the supplied PRD and user feedback. [FEATURE_MATRIX.md](FEATURE_MATRIX.md) distinguishes current behavior from remaining requirements; physical iPhone/native validation and conditional service setup remain separate work.

## Project documentation

| Document                                           | Contents                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| [PRD.md](PRD.md)                                   | Supplied product specification                                               |
| [FEATURE_MATRIX.md](FEATURE_MATRIX.md)             | Implemented, limited, conditional and future requirements                    |
| [ARCHITECTURE.md](ARCHITECTURE.md)                 | Module boundaries, persistence, offline behavior and integration paths       |
| [DATA_MODEL.md](DATA_MODEL.md)                     | Contracts, measurement conventions, backups and versioning                   |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)               | Colors, typography, components, layout and accessibility                     |
| [UI_REFINEMENT.md](UI_REFINEMENT.md)               | Interaction feedback, visual direction and applied design-skill references   |
| [SCIENTIFIC_BASIS.md](SCIENTIFIC_BASIS.md)         | Evidence, algorithms, assumptions and limits                                 |
| [EXERCISE_ATTRIBUTION.md](EXERCISE_ATTRIBUTION.md) | Dataset revision, license, selection and source-quality limits               |
| [INTEGRATIONS.md](INTEGRATIONS.md)                 | Optional services, external credentials and browser/native restrictions      |
| [PRIVACY.md](PRIVACY.md)                           | Actual data storage, flows and controls                                      |
| [DEPLOYMENT.md](DEPLOYMENT.md)                     | Local commands, HTTPS hosting, Safari installation and future App Store path |
| [TEST_REPORT.md](TEST_REPORT.md)                   | Exact final validation results                                               |
