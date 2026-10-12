# Setwise validation report

Setwise **1.4.1** verification: **October 12, 2026**.

## Current results

- TypeScript, ESLint, production build and whitespace checks pass.
- **348 unit/integration tests pass in 19 files**.
- **52 browser journeys pass**: 51 passed in the complete run; the new Settings inventory test had an incorrectly scoped nested locator, was corrected, and passed its targeted rerun. No application change was needed for that failure.
- Six new journeys verify exclusive No equipment selection in onboarding/Settings, cleared and disabled alternatives, keyboard selection, saved/reloaded inventory and legacy mixed records staying unchanged until editing; 700 ms hover delay/cancellation/restart, immediate keyboard help and clicking an action beneath a passive tooltip; final-set return to exercise selection with skipped sets/rest/history preserved, and session save returning to Today with the next planned workout available.
- Existing browser journeys continue to pass for saved data, backup/restore, offline reopening, equipment adaptation, nutrition, timer recovery, template deletion, onboarding and responsive/accessibility checks.
- A separate Playwright CLI mobile screenshot verifies the visibly grayed inventory: `artifacts/screenshots/setwise-exclusive-inventory.png`. Explicit help remains interactive; passive hover explanations do not capture pointer clicks.
- Capacitor iOS sync passes with the current web assets. Native Xcode/signing, physical iPhone/Safari/VoiceOver and camera testing remain unrun on this Windows machine.

Evidence: `artifacts/setwise-1.4.1-final` and `artifacts/inventory-rerun`; local generated artifacts are excluded from GitHub source. The main chunk is approximately 2.02 MB / 373 KB gzipped; 30 files totaling approximately 3.05 MiB are precached. The build-size advisory is not a failure. The existing Pages base-path configuration remains unchanged; its 1.4.0 offline project-path smoke result is retained below.

## Historical 1.4.0 verification

Setwise **1.4.0** verification: **October 12, 2026**.

## Current results

- TypeScript, ESLint, production build and whitespace checks pass.
- **343 unit/integration tests pass in 18 files**, covering persistence, training, search, substitutions, workout management, icons, help, timers, food normalization and the offline catalog.
- **14 Python food-importer tests pass**. Regeneration from the checksum-verified USDA archive is byte-identical to the generated 905-food catalog. Forty common food references are guaranteed despite category limits.
- **46 browser journeys pass in one complete final run**, with zero failures, against the frozen 1.4 production build in installed Chrome on Windows. The run took approximately 1.5 minutes. Test records and mocked food-provider responses are isolated from user records.
- New journeys cover Welcome/Get started/setup reload, clickable Home logo, exactly two visible mobile header buttons, footer clearance at 320/393/740 widths, home calisthenics with an explicit skip, and typo queries including `psuh`, `situps` and `sutups`.
- Workout-management journeys cover 22 selectable icons, keyboard selection, recent/name sorting, save/reload, canceled deletion, permanent deletion, and finishing a resumed workout after its template is gone while retaining prior history. Program padding and small-phone/landscape icon targets pass automated accessibility checks.
- Timed-set journeys cover pause/reload/resume, actual-duration logging, reset/manual entry, a running countdown across reload, visible overtime and no automatic set completion. Food journeys cover modern v3 normalized facts without legacy fields or optional fiber, unknown-label manual entry, UPC-padding offline reuse, offline USDA selection and fetching a second provider search page.
- Automated accessibility checks pass in the tested Welcome, Home, onboarding, planning, icon, deletion, focused logging, timer, food-search and other existing test regions. Checked-control contrast passes for Sage, Sky blue, Violet and Neutral. These are scoped browser results, not an accessibility certification.
- A separate `/GYMSomething/` production build passes manifest/icons/service-worker scope, missing-asset and outside-base request checks. A logged set survives full offline reload/resume with no page errors. Evidence: `artifacts/pages-smoke-result.json`.
- Capacitor iOS synchronization passes; the current web assets are copied into the generated source. Native Xcode compilation, signing, physical iPhone/Safari/VoiceOver and camera scanning remain untested in this Windows environment. Hosted-site browser verification is skipped at the user's request; GitHub Actions confirms publishing separately.

The main chunk is approximately 2.02 MB, 372 KB gzipped. Nutrition is a separate 385.6 KB chunk, 47 KB gzipped, containing the read-only generic food catalog. The precache includes 30 entries, approximately 3.05 MiB. Vite's chunk-size advisory is not a failed build.

Executed commands include `tsc -b`, `eslint .`, `vitest run`, `scripts/test_build_food_catalog.py`, `vite build`, `playwright test --output artifacts/setwise-1.4-final --reporter list`, the local project-path smoke script, and `cap sync ios`. Local screenshots/traces are retained in `artifacts/setwise-1.4-final` and `artifacts/screenshots`, excluded from GitHub source. Playwright CLI was also used for a separate local mobile Welcome snapshot/screenshot.

The final suite has no failing tests. Earlier checks exposed stale test selectors after moving mobile equipment selection and a lazy-screen timing race in a new nutrition test; the tests were corrected. The offline-food journey also found a real catalog-coverage gap, corrected by guaranteed common-food references.

## Historical 1.3.0 verification

Setwise **1.3.0** verification: **October 12, 2026**.

## Current results

- TypeScript, ESLint and production build pass.
- **258 unit/integration tests pass in 13 files**, including 55 beginner-help tests and 10 muscle-icon tests.
- **33 browser journeys pass across six files**: 27 legacy journeys passed initially; one responsive/axe journey passed on its targeted rerun after the tooltip was placed in a named help region. All five new Setwise journeys passed against the final build.
- New checks cover onboarding explanations and Escape, touch Help mode blocking a toggle action, normal saved toggles after exiting Help, mouse/keyboard descriptions, actual muscle-target icons, 320/375/393/852/1440 layouts, and selected controls across Steel, Violet and Neutral accents. Chrome control checks also cover keyboard Space, indeterminate state, 44px targets, reduced motion and forced colors.
- Selected switch thumb contrast is **9.27–13.63:1** across the three palettes; selected versus unselected tracks are **8.89–12.66:1**. Color is accompanied by thumb position/checkmark state.
- A separate `/GYMSomething/` production build passed manifest/icon/service-worker path checks and offline set save/reload/resume. No outside-base asset requests, missing assets or page errors were found. Evidence is retained locally in `artifacts/pages-smoke-result.json`.
- Generated iOS source and Setwise icons are available. Physical iPhone/Safari/VoiceOver tests, Xcode builds and signing were not run in this Windows environment.

The final main chunk is approximately 2.00 MB, 367 KB gzipped. The precache includes 30 entries, approximately 2.67 MiB. The chunk-size advisory is not a failed build.

Local screenshots and traces are generated evidence and are excluded from the GitHub source repository. The retained files include `artifacts/setwise-test-results`, `artifacts/legacy-help-results`, `artifacts/legacy-help-rerun-results` and `artifacts/screenshots/setwise-*.png`.

## Historical 1.2.0 verification


Setwise **1.2.0** delivery verification: **October 11, 2026**. This report describes executed checks, rather than treating browser emulation as a physical iPhone test. The latest pass covers the graphite/steel-blue redesign, all daily workouts, preset application previews, weekly phases, cm/feet/inches height, visible optional onboarding, editable goal timelines, saved appearance preferences and phone-local persistence.

## Final results

| Check                                                  | Result                     | Evidence                                                                                                                                                            |
| ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript strict project check                        | Passed                     | `node node_modules/typescript/bin/tsc -b`                                                                                                                           |
| ESLint application, configuration and tests            | Passed                     | `node node_modules/eslint/bin/eslint.js .`; generated builds/traces excluded                                                                                        |
| Unit/integration tests                                 | **193 passed in 10 files** | Vitest 5.0.3; final run 8.88 seconds                                                                                                                                |
| Production build                                       | Passed                     | Vite 8.3.4; `dist/` plus manifest and service worker generated                                                                                                      |
| Browser journeys                                       | **28 passed, zero failed** | Playwright 1.64.0, installed Chrome on Windows; full suite 1.1 minutes (tool-reported)                                                                              |
| Responsive layout                                      | Passed                     | Home at 320/393/430/1440 px; Library/Plan/Progress and workout overview/focus at 320/393/1440 px; larger text and 844×390 landscape logging; no horizontal overflow |
| Automated accessibility                                | Passed in tested regions   | Axe reported zero violations for Home, Library/Plan/Progress/workout overview/focus, onboarding, Nutrition, goal editor and program preview regions at 393 px       |
| Production dependency audit                            | Passed                     | `pnpm audit --prod --audit-level high`: “No known vulnerabilities found”                                                                                            |
| Capacitor source generation and synchronization        | Passed                     | `cap add ios` and final `cap sync ios`; Swift Package Manager source project and current web assets present                                                         |
| Native Xcode build, signing, simulator and real iPhone | **Not run**                | This delivery environment is Windows; no Apple build/device environment was available                                                                               |

No failing automated tests remain. Expanded accessibility checks initially found an unlabeled-role setup indicator, a weak form-label association, a preview that lacked keyboard focus, and an inline source link distinguished only by color. The source was corrected and the final complete 28-journey suite passed. A New York timezone regression verifies that recorded goal achievement dates do not display a day early. One preset journey was subsequently rerun solely to retain the daily-workout visual screenshot; it passed.

The production build emits a chunk-size advisory: the bundled exercise catalog and shared runtime produce an approximately 1.95 MB main JavaScript chunk, about 350 KB gzipped. This is an optimization opportunity, not a failed build. All application chunks are precached, including lazy nutrition/scanner modules; the final precache covers 30 entries, approximately 2.62 MiB.

## Unit and integration coverage

The ten test files cover:

- Training calculations: kg/lb conversions, guarded Epley e1rm, external-load volume, warm-up exclusion, direct/indirect muscle sets, records, goals, training-day streaks, strength tiers and progression strategies/gates.
- Equipment: required supports/machines, incline and dumbbell constraints, compatible alternatives and measurement/load distinctions.
- Persistence: 60 storage tests cover compressed catalog reconstruction, edited/custom exercises, active-session recovery, immutable snapshots, serialized writes, quota/permission failures, readable JSON backup/restore, validated read-only legacy migration and explicit legacy deletion.
- New planning and goal calculations: idempotent preset application, calendar/rest/history protection, phase/lighter target copies, date rotation, editable weight/rate/week arithmetic, unit conversion, manual deadline preservation and recorded target crossings. Height conversion uses canonical centimeters while displaying feet/inches.
- Data protection: invalid dates/IDs/references/media/endpoint data, invalid suggestion fields, unsupported stored schema recovery and stale-tab writes that must not overwrite newer records.
- Nutrition: portions, grams, recipes, food-record normalization, QR/barcode validation, diary summaries and safe CSV exports.
- Optional adapters: AI endpoint/consent/context/response/error behavior, food API handling, voice-command parsing and in-app/calendar reminders.

These tests establish the implemented calculations and contracts. They do not clinically validate a training prescription, establish medical thresholds, or certify every source exercise instruction.

## Browser journeys

1. New user onboarding, template planning, real set logging, workout completion and history review.
2. Offline service-worker control, set logging, closing the page, a cold offline reopen, active-session recovery and completion without network.
3. Equipment changes, compatible substitution choices, zeroed replacement loads and preservation of the original template.
4. Custom exercise creation, template use, active logging and saved history.
5. Manual food creation, portion-based nutrition, recipe ingredients/yield and water persistence.
6. JSON download, confirmed local reset, file-based validated restore and preserved active-workout data.
7. Home mobile/desktop overflow checks, accessible controls, default AI absence and destination screenshots.
8. Goal milestones, manual progress history and persistence after reload.
9. Multiweek program scheduling, approved lighter-week template copies and idempotent reapplication.
10. Modified progression approval affecting future targets while preserving recorded prescription snapshots.
11. Bodyweight measurements, relative-strength goal updates and editable strength benchmarks.
12. Pound conversion and timed zero-repetition rules when saving templates.
13. Custom exercise creation inside a workout picker, nested editor, selection, completion and reload recovery.
14. Library/Plan/Progress layout and accessibility checks across mobile and desktop sizes.
15. Complete optional setup, body measurements and unit conversions, training preferences, equipment inventory and nutrition enablement without fabricated history.
16. Nutrition discovery while disabled, clearable food/water fields, diary persistence and disabling/re-enabling without losing records.
17. Workout overview, primary/secondary muscles, single-exercise focus, real keystrokes replacing zero, cleared/replaced entries, next/previous navigation, technique, timed holds, saved focus and history corrections.
18. Workout overview and focused logging layout/accessibility across phone and desktop sizes.
19. Reachable workout navigation with larger text, reduced motion and landscape logging.
20. Simulated local-storage quota failure: the previous saved record stays intact, unsaved workout edits export correctly and resume feedback reports unsaved changes.
21. Height editing in Settings, cm/feet/inches conversion, blank and zero inches, clearing optional height and reload persistence.
22. Bodyweight goals estimated from current/target weight, edited weeks/rate, manual deadline preservation, kg/lb conversion and reload persistence.
23. Saved accent/density choices and exactly one visible 44 px Settings action on phone and desktop.
24. Preset date preview, actual Home/Today calendar workouts, accessible preview and duplicate-free reapplication after reload.
25. Two workouts on one day, selecting the intended session, overview/focus recovery and completion linked to the correct calendar entry.
26. Two phases created in the editor, separate target versions, preserved rest, stable copies after reload/reapplication and frozen targets after the base workout changes.
27. Explicit plan replacement with a reviewed count, preserving rest/skipped/completed/active/history-linked and out-of-range records.
28. First recorded goal achievement rendered on the correct local date in America/New_York.

Each journey uses its own browser context and test records. Names and statistics in retained screenshots are test fixtures; fresh app installations contain no fabricated personal workout history.

Onboarding actions are checked fully inside the viewport at 320×568, 375×667, 852×393 and 393×852. Its primary-focus menu is also selected entirely with the keyboard, and advancing a step resets the form-body scroll position.

## Visual and performance evidence

Reviewed screenshots show Home, all daily workouts, Train, Library, Plan, Progress, onboarding, Nutrition, the workout overview, focused logging, goal estimates and the dated program preview. Files are retained in [artifacts/screenshots](artifacts/screenshots/), including [the iPhone-sized preview](artifacts/screenshots/forma-iphone-preview.png), [focused exercise](artifacts/screenshots/workout-focus-393.png) and [nutrition diary](artifacts/screenshots/nutrition-mobile.png). Automated browser results are in `artifacts/final-test-results/`; source tests are in `tests/e2e/`.

[artifacts/performance.json](artifacts/performance.json) contains a final localhost navigation sample. Its `usableMs` key stores `domContentLoadedEventEnd`; it is not a time-to-interactive measurement. This single desktop/local sample does not establish mobile network performance or iPhone interaction latency. Search and set logging were exercised functionally in the browser journeys.

Native source asset checks verify opaque 1024×1024 app artwork, 2732×2732 splash images, valid plist/XML/JSON, the Setwise display name and camera permission description. The copied iOS `public/` web files match the final `dist/` output. These are source/asset checks, not an Xcode compilation.

Verified delivery archives are [releases/setwise-web.zip](releases/setwise-web.zip) and [releases/setwise-ios-source.zip](releases/setwise-ios-source.zip). ZIP integrity tests passed; their byte sizes and SHA-256 hashes are in [releases/manifest.json](releases/manifest.json). `scripts/package-delivery.py` validates native assets and synchronized web files before creating them. It requires Pillow for asset inspection; ordinary app development/building does not require Python.

## Optional integration verification and limits

| Integration               | What was verified                                                                                                     | Still required                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Open Food Facts           | Parsing/error/throttle/cache tests; implementation-time live staging product/search responses successfully normalized | Public deployment identification/proxy requirements, production CORS/rate-policy behavior and actual camera scanning |
| AI                        | Secure configurable endpoint adapter, granular context consent, error handling and no automatic record changes        | A user-owned server/provider endpoint and an actual configured-provider test; no model/backend is included           |
| Voice                     | Deterministic command tests and browser feature detection/manual fallback                                             | Real microphone, permissions and supported SpeechRecognition service/device testing                                  |
| Spotify                   | PKCE, transient-token flow and playback/fallback implementation inspected; project compiles                           | Registered client/redirect, permitted Spotify account, Premium active device and live OAuth/playback tests           |
| Reminders                 | In-app reminder/time/quiet-hour tests and `.ics` generation                                                           | Native/push infrastructure for dependable background delivery                                                        |
| Native Apple integrations | Explicit unavailable boundaries and generated Capacitor source                                                        | HealthKit, Watch, Siri/App Intents, Foundation Models, Live Activities and automatic rep counting remain future work |

Physical iPhone Safari installation, WKWebView behavior, VoiceOver, touch keyboards, permission prompts, camera/speech hardware, persistent storage behavior and native signing remain external quality gates. No hosted deployment or App Store binary has been created. Remaining PRD scope is listed in [FEATURE_MATRIX.md](FEATURE_MATRIX.md).

## Reproduce

Use Node **24 LTS** and install dependencies first. Ordinary terminal commands are:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit --prod --audit-level high
pnpm ios:sync
```

Equivalent `npm run` scripts are documented in [README.md](README.md). Playwright starts a local production preview on port 4173, reuses an already running server, uses installed Chrome when found at the standard Windows path, and otherwise uses its installed Chromium. `PLAYWRIGHT_CHROME_PATH` overrides the executable. WebKit/Safari is not part of this executed suite.

This restricted Windows environment invoked package binaries through Node because npm was not on PATH. Worker/browser/build process spawning required approved sandbox escalation; checks ran locally, without publishing or communicating with third parties beyond package/audit and the explicitly exercised optional food source. The equivalent package scripts use the same test/build tools.

See [DEPLOYMENT.md](DEPLOYMENT.md) for HTTPS installation and the Mac/Xcode distribution workflow, and [README.md](README.md#keep-a-backup) for backup instructions.
