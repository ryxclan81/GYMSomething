# Optional integrations

Core workouts, planning, progression and manual nutrition require no account, external service or database service. Records use compressed phone/browser local storage. Nutrition, voice, AI and Spotify are off by default; the visible Nutrition destination offers explicit enablement. Disabling a module preserves its records. No integration automatically creates a paid account or installs provider credentials.

## Food database and scanner

`src/integrations/food.ts` implements real read requests to Open Food Facts: v3.6 product-by-barcode and its legacy `/cgi/search.pl` full-text search. It reads both legacy `nutriments` and newer `nutrition.aggregated_set`/complete manufacturer or packaging `input_sets`, with kcal/kJ and gram-unit conversion. Search is explicitly submitted, never requested on each keystroke, with 50 raw products per page and a Load more action. The provider's official full-text search service did not expose browser CORS headers during this review, so it is not used as a direct-browser fallback.

Foods with complete energy/protein/carbohydrate/fat values are cached in phone-local `AppData` and remain usable offline after a successful save. Missing required macros are rejected instead of silently treated as zero; fiber may be omitted. Imported records use a 100 g reference portion; complete gram-based serving facts can be normalized. Volume-only facts cannot be converted into grams without density and offer manual label entry instead. Portions and grams remain editable. Label verification is recommended because this is contributor-maintained data.

The official API introduction inspected for this build specifies 15 product-read requests/minute/IP and 10 search requests/minute/IP. The adapter spaces barcode requests by at least 4.2 seconds and searches by 6.5 seconds, with HTTP 429/503 handling. Other applications on the same IP can consume the shared allowance. Client throttling is a courtesy, not a guarantee against server limits.

Requests include application identification parameters and attempt a custom User-Agent. Some browsers control or discard the User-Agent header. Before public distribution, register the application with Open Food Facts using its usage form, provide a contact URL/email, and use a narrowly scoped proxy that sets the required custom User-Agent if the browser cannot do so. There is no mandatory proxy or backend for local manual nutrition. Browser CORS, service downtime and identification enforcement can prevent online lookup; manual foods and previously cached foods always remain available. No write/upload API is used.

Data attribution is preserved per Food and in exports. The database is ODbL and individual contents are DbCL. Sharing a derived or combined database can invoke attribution/share-alike duties; review the terms before redistributing a public food database. Private workout and food-diary backups are not published by this app. No Open Food Facts product images are copied (their separate CC BY-SA terms would also require review).

Camera decoding uses native BarcodeDetector where available and lazy-loaded `@zxing/browser` elsewhere, including a compatible Safari path. HTTPS, permission, camera hardware and actual barcode quality determine success. Camera frames stay on the device; only the detected code is used for lookup. Numeric UPC/EAN/GTIN codes, explicit UPC-E expansion, HTTPS Open Food Facts product links and check-digit-valid GS1 Digital Links are supported; supplied URLs are never opened. Zero-padded UPC/GTIN equivalents reuse a saved barcode before contacting the provider. Unknown products can be entered from their label with blank nutrients and reused offline. Closing the scanner stops its stream. Manual entry is always available; physical iPhone camera operation remains untested.

Official references: [API introduction and limits](https://openfoodfacts.github.io/openfoodfacts-server/api/), [terms and reuse](https://world.openfoodfacts.org/terms-of-use), [API tutorial](https://openfoodfacts.github.io/openfoodfacts-server/api/tutorial-off-api/).

The offline library contains 905 generic foods from the public-domain April 2018 USDA SR Legacy bulk release. It needs no API credential and remains separate from branded barcode results. Bundled foods stay outside `AppData` until logged, favorited or saved through the editor. The source, historical-data limitations and reproducible importer are recorded in [FOOD_ATTRIBUTION.md](FOOD_ATTRIBUTION.md). A live USDA API, complete micronutrients and photo-based nutrition estimation are not implemented.

## Speech

`src/integrations/speech.ts` detects SpeechRecognition/webkitSpeechRecognition. `startSpeech(onResult, onError)` starts recognition for one utterance and returns an abort function. No continuous listening, local audio file or fake transcript is used. The deterministic `parseVoiceCommand(text)` understands set logging, load changes, adding a set, rest duration, next/history/remaining inquiries and finishing/skipping commands. Ambiguous input returns null. The workout UI previews commands and requires explicit confirmation before destructive changes. Text command and manual input remain available.

Browser exposure does not guarantee availability or offline operation. Browser speech services may transmit audio to their own service. Setwise does not route audio to an AI provider. Revoke microphone permission through browser site settings. Future native speech/App Intents require a separate adapter and device testing.

Reference: [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## AI endpoint contract

AI is disabled and unconfigured by default. `AIProvider` exposes `ask(question, data, signal)`. `endpointAI` sends JSON only when the user asks a question and only while AI is enabled. Settings separately opt into training preferences, recent workout summaries or nutrition summaries. Names, body measurements, limitations, exercise/workout notes and personal food notes are omitted even with these permissions. Questions are user-authored, so users control their own included content.

Configure an HTTPS endpoint in Settings, or a relative same-origin endpoint such as `/api/coach`. Credentials, URL usernames/passwords and query-string secrets are rejected. The browser never accepts a provider API key. The endpoint is optional infrastructure owned by the deployer and is not included as a running backend in this project. It must handle authentication as needed, strict origin checks, request size limits, CSRF, quotas, provider-key storage, evidence-aware prompts, logging/privacy and a policy that never falls back to a paid provider.

Request example:

```json
{"question":"Explain double progression","context":{}}
```

Response contract:

```json
{"answer":"Provider-generated plain text"}
```

Consent can add `context.profile`, `context.training` (last 10 completed sessions) and `context.nutrition` (targets and last 50 entries). The response is rendered as plain text; it cannot execute code or modify programs. A quota failure presents an unavailable message, with no alternate request. No model or billing account is selected automatically.

Gemini offers model-dependent free tiers and rate limits, which can change. Its unpaid-service terms include provider use of submitted content for improvement, with regional exceptions. A deployer must verify current terms, eligibility, quotas, consent wording and privacy suitability before implementing a Gemini endpoint. This app has no built-in Gemini key, free-tier guarantee, paid fallback, local model or working Apple Foundation Models implementation.

References: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini terms](https://ai.google.dev/gemini-api/terms).

## Spotify

`src/integrations/spotify.ts` implements Authorization Code with PKCE (SHA-256), a random verifier/state, verified OAuth callback, token refresh and play/pause/next/previous Web API calls with the minimal `user-modify-playback-state` scope. No client secret is required or accepted. Configure your public Client ID in Settings. Register the exact displayed redirect URL in your own Spotify developer application, add your user to its allowed users, then authorize. For local testing use `http://127.0.0.1:5173/`; Spotify explicitly rejects `localhost` redirects. Production redirects require HTTPS.

The public Client ID is stored locally outside AppData. PKCE verifier/state exist in sessionStorage until the callback is consumed. Access and refresh tokens exist only in module memory, never localStorage/IndexedDB or backups. Reloading requires reconnecting. Disconnect clears app-held credentials; users can additionally revoke application access in Spotify account settings. OAuth authorization codes are removed from address/history before token exchange.

Controls act on the currently active Spotify device, not a web audio player embedded in Setwise. Open Spotify and begin playback first. These playback endpoints require Premium, and developer access/allowlisting policies can block users even with Premium. Responses for missing device, expired session, forbidden access and rate limits are handled. The always-available Open Spotify fallback works without developer credentials. No Spotify Free API playback support is claimed. Authentication/live playback require user credentials and have not been tested against a real Spotify account.

References: [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow), [redirect rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri), [playback Premium restriction](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback), [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes), [2026 changes](https://developer.spotify.com/documentation/web-api/references/changes/february-2026).

## Reminders and calendar

Reminder preferences include enablement, categories, days/time, quiet hours and tone. `inAppReminder(data, now)` derives a single eligible reminder from actual local records. It requires an enabled category, an enabled day, the chosen time and being outside quiet hours, and is available only while the app is running. Background delivery is not promised. A clock/time-zone change follows the browser/device local time.

Export planned workouts to `.ics` under Settings → Reminders & calendar. It includes planned sessions in the next 90 days at your chosen time with a 15-minute display alarm. Import into Apple Calendar; calendar permissions and notification settings control alerts. Updating Setwise does not update an already imported calendar, and repeated calendar imports may duplicate events depending on the calendar application. Calendar alerts do not inherit Setwise quiet hours.

No push service, subscription server or guaranteed scheduled PWA notification is implemented. iOS web push requires installation, permission and an appropriate push delivery system. Native local notifications are a future Capacitor plugin, not an enabled capability.

## Native capability boundary

`src/integrations/native.ts` explicitly reports HealthKit, Apple Watch, Live Activities, Foundation Models, App Intents and native local notifications as unavailable. A Capacitor iOS source project is generated at `ios/App/App.xcodeproj`, using Swift Package Manager with copied web assets; Xcode compilation, signing and device execution remain untested. The generated wrapper does not implement these integrations. They require macOS/Xcode, native code, entitlements and hardware validation. No Apple Developer enrollment is needed for the PWA; App Store distribution would require enrollment and review.
