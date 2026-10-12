# Setwise privacy and data controls

This document describes the implemented local-first application. It is a starting policy for deployment, not a declaration about infrastructure a future deployer may add.

## Default operation

No account, advertising, tracking analytics, subscription, database service or automatic cloud sync is used. Profile preferences, equipment, custom exercises/media, workouts, programs, schedule, goals, body metrics, nutrition foods/recipes/diary/water, consents and settings are stored in compressed local storage on this phone/browser at `forma.data.v1`. Unchanged built-in exercises rehydrate from bundled text; personal edits and historical snapshots stay in the saved state. PWA code/assets use the service-worker cache. A different browser/origin or cleared website storage has separate or empty records.

Hosting a deployed app necessarily creates ordinary network requests for application files. A hosting provider may maintain IP/access logs; configure and describe the actual deployment’s retention before public use. Offline app use does not send fitness records to the host. Compression is not encryption. There is no app-managed encryption or cross-device recovery; device access and browser security protect local data.

The current app creates no new database. When the new local-storage record is absent, it can read an older `forma-training` IndexedDB record through a native read-only transaction and validate/copy it into local storage. Migration does not alter or remove that old record. Current local-storage records take precedence; legacy data remains until explicit full-data deletion.

## Optional network flows

| User action | Destination | Data sent | App storage |
| --- | --- | --- | --- |
| Submit online food search | Open Food Facts | Search words, app identification, normal network metadata | Returned complete food records cached locally |
| Look up barcode | Open Food Facts | Numeric product barcode and app identification | Returned product cached locally |
| View an exercise demonstration | GitHub raw content | Public image path and ordinary connection metadata | Images are network assets, not guaranteed offline; exercise text stays bundled |
| Use camera scanner | Device/browser | No camera-frame upload; subsequent barcode lookup as above | No camera recording saved |
| Push to talk | Browser’s speech provider, if its engine uses a service | Microphone audio according to browser/provider policy | Transcript used for command preview; audio not stored by Setwise |
| Ask AI coach | User-configured secure endpoint and its configured provider | User question plus separately consented context categories | Answer only in current UI; no automatic record changes |
| Authorize/control Spotify | Spotify accounts/API | OAuth client ID, PKCE authorization and playback requests | Public client ID locally; verifier/state in sessionStorage; tokens memory only |
| Download backup/CSV/calendar | User-selected download location | Nothing uploaded by Setwise | Exported file is controlled by the user |

Optional nutrition, AI, voice and Spotify are off by default. Nutrition remains a visible destination with an explicit enable action; opening it does not authorize AI context sharing. Opening or using core training does not require optional services. Open Spotify opens Spotify in a separate browser context. No product photos or third-party exercise videos are automatically loaded by the nutrition module.

AI profile consent shares training focus, experience, preferred days, session duration and units; it excludes name, height/bodyweight and limitations. History consent shares the last 10 completed sessions’ exercise names, dates and completed set values, excluding notes. Nutrition consent shares targets and the last 50 entries’ date/food name/portions/macros, excluding notes. User-written questions can themselves contain personal data. Disabling consent prevents future sharing but cannot erase data already received by a third-party endpoint/provider. Its operator must disclose retention and deletion rights. No secure AI backend runs with this app by default.

Open Food Facts and browser/Spotify/AI services receive ordinary connection metadata such as IP address. Their own policies apply. Free-tier AI is not inherently private; review provider terms before opting in. No inference of medical conditions is made by Setwise.

## User control

Use Settings to disable optional modules and revoke each AI context permission. Disabling a module does not delete its records. Revoke camera/microphone permissions in your browser’s site settings; close the scanner to stop its camera stream. Disconnect Spotify locally in Settings, and revoke its application access in your Spotify account if desired.

Settings → Backup & data provides full JSON backup, validated JSON restore, workout and nutrition CSV, nutrition deletion and deletion of all local app records. Restore replaces current records only after validation and a successful local-storage save. Destructive operations require a typed confirmation. Back up before restoring/deleting. Browser storage clearing removes app data independently of these controls.

Full backups contain personal fitness and nutrition records, notes and any saved custom-exercise media. Treat them as sensitive; keep them privately and avoid sending them to untrusted services. They exclude Spotify client configuration/tokens because those live outside the saved `AppData`. The AI endpoint address and consent preferences are included, but no provider key is accepted by this app. CSV includes source attribution and prevents leading spreadsheet formulas from executing.

Full deletion resets saved `AppData` records/preferences and attempts to delete the former IndexedDB database. If another tab blocks legacy deletion, the app reports that current data was reset but legacy removal remains incomplete. Spotify's public client configuration lives separately; use Disconnect to clear app-held credentials and Spotify's account controls to revoke access. Deletion does not remove downloaded files, records sent to an opted-in provider, hosting logs or Spotify-held account data. A service-worker cache may remain until website storage is cleared; it contains application assets rather than personal workout records.

## Retention and limitations

Local records persist until you remove them or browser/device storage is cleared. Quotas can fill as history/media grow. Failed saves show an error and preserve unsaved state for recovery export; no cloud copy is created to rescue it. Invalid saved records are protected from overwrite and remain exportable, including a raw recovery wrapper when decoding fails. Web Locks coordinate tabs where supported; the synchronous fallback has weaker concurrency guarantees. Keep private backups and avoid concurrent editing when practical.

No automated remote retention exists. Fitness/nutrition estimates are for personal training reflection and are not diagnoses. Cloud syncing, telemetry, photo-based food analysis, HealthKit, Apple Watch or native speech/push additions would require an updated policy and explicit permissions before release.

Third-party references: [Open Food Facts reuse terms](https://world.openfoodfacts.org/terms-of-use), [Spotify privacy](https://www.spotify.com/legal/privacy-policy/), [Web Speech recognition behavior](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [Gemini additional terms](https://ai.google.dev/gemini-api/terms).
