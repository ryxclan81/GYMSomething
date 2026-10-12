# Run, install and package Setwise

The repository builds an iPhone-focused PWA and includes a generated Capacitor iOS source project with copied web assets. It has no hosted deployment URL yet. The Windows environment can build/test the web application and generate/sync native source; Xcode compilation, signing and physical iPhone installation require separate validation.

## Local development

Install **Node.js 24 LTS (24.0 or newer within 24.x)** and a package manager. The installed `@zxing/library` 0.23.0 declares Node `>=24.0.0`, which is stricter than Vite's minimum and ESLint 10's Node 22.13 floor. Node 24 also satisfies the installed Vitest 5 engine range. Use the supplied lockfile for reproducible versions; recheck dependency engines after upgrades.

From the project directory:

```sh
npm install
npm run dev
```

Open [Setwise locally](http://127.0.0.1:5173). No `.env` secret or account is needed. `.env.example` explains the optional configuration policy. If the port is occupied, use the URL Vite prints.

The repository includes `pnpm-lock.yaml`. With pnpm installed, the reproducible alternative is:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Use one package manager per checkout. npm creates its own lockfile on first installation; pnpm uses the supplied lockfile. Development server dependencies are not required on the iPhone.

## Production build and verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

The build writes `dist/`, including generated manifest, service worker, icons and cached application chunks. Preview serves the production build at the loopback URL Vite prints, normally port 4173. The development server is for editing; use the production build to verify service-worker/offline behavior.

For browser journeys, install Playwright browsers once, then run:

```sh
npx playwright install chromium
npm run test:e2e
```

Consult `playwright.config.ts` and [TEST_REPORT.md](TEST_REPORT.md) for the tested browser/server configuration and exact results. The configuration uses system Chrome on Windows if its standard installation path exists, and Playwright's bundled Chromium otherwise. `PLAYWRIGHT_CHROME_PATH` can override the browser executable when needed. A sandbox may require permission to start browser/worker processes; ordinary local terminals normally do not have that restriction.

## Static HTTPS hosting

Upload the **contents of `dist/`** to the root of a static HTTPS site. Configure the site to serve `index.html` for application navigation and serve generated JavaScript/CSS/manifest/service-worker files with their correct MIME types. Keep the manifest scope, asset URLs and service-worker scope at `/` as currently configured. Hosting under a project subpath requires changing Vite's base, manifest URLs/scope, icon paths and service-worker fallback before rebuilding; merely copying this build into a subdirectory is not supported.

Cache fingerprinted assets for a long duration; allow the HTML, manifest and service-worker entry to revalidate so updates can be discovered. Use a stable origin for daily use: switching domain, scheme or port creates separate local storage. Export/import transfers records when moving deployments. The app has no required backend, database service or automatic cloud sync; new app records use compressed phone/browser local storage.

For public food lookup, follow Open Food Facts registration/identification terms and provide a contact. Browsers may discard its requested custom User-Agent. Use a narrowly scoped proxy that sets the required identification header where necessary, as described in [INTEGRATIONS.md](INTEGRATIONS.md). Manual/cached foods and workouts do not require this proxy. A configured AI endpoint is separate optional infrastructure; never put provider keys or a Spotify client secret into `VITE_*`, static files or the browser bundle.

## Install on iPhone

1. Deploy the production build to a stable HTTPS URL and open it in **Safari** on the iPhone.
2. Complete onboarding and wait for offline preparation. Open the main destinations so the application is ready for use.
3. Open Safari's **Share** menu (via the Page Menu on some layouts), choose **Add to Home Screen**, enable **Open as Web App** if offered, and tap **Add**. See [Apple's instructions](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios).
4. Launch Setwise from its Home Screen icon. Confirm your profile and equipment inventory there; if Safari and the installed app have separate storage, use a JSON backup/restore to transfer your data.
5. While online, wait for the installed app's assets to be cached. Then test airplane-mode relaunch, start/resume a workout, log a set, finish it and check history on the physical device.

The PWA needs no Apple Developer membership, native development signing or seven-day native provisioning renewal. Core use continues offline after successful cache preparation. Installing does not prevent Safari/device storage from being cleared, so keep backups. A plain HTTP LAN URL from the PC can show a development preview but does not provide the trusted HTTPS context needed for dependable PWA/camera installation. `127.0.0.1` on an iPhone refers to the iPhone, not the PC.

No physical iPhone, Safari Home Screen installation, camera or speech service was available to validate in the Windows build environment. Browser viewport/offline tests are documented separately and are not represented as hardware tests.

## Updates and backups

Finish the active workout before adopting an update. When notified, close all Setwise tabs/installed windows and reopen while connected. The app does not force a mid-workout reload. Local records stay separate from the application asset cache. Future encoding/schema/catalog changes must provide a deliberate migration or full-backup transfer path; a changed bundled catalog cannot be silently substituted into a compact saved record.

Use **Settings → Backup & data → Download full JSON backup**. Save the file privately, preferably outside the browser/device that holds your only copy. Restore through the same panel using a file or pasted JSON; type `RESTORE` after reviewing that current local records will be replaced. Invalid JSON/schema/reference data is rejected before replacement. CSV exports help analysis but cannot restore the full app. Local storage has a device/browser quota: growing histories and custom media can fill it. Failed saves expose a visible error and recovery export; keep that page open until unsaved records are backed up. Custom media can also enlarge backups beyond the UI's 20 MB file limit; see [DATA_MODEL.md](DATA_MODEL.md).

An older IndexedDB record is read/validated and migrated only when no current local-storage record exists. Migration leaves the old data untouched and creates no new database. Explicit deletion also attempts to remove the legacy record. Web Locks coordinate tabs where supported; the synchronous fallback detects changed records but has weaker concurrency guarantees, so use one editing window when practical.

## Generated Capacitor iOS project

`capacitor.config.ts` uses app ID `app.forma.training`, name `Setwise` and `webDir: 'dist'`. The source project exists at `ios/App/App.xcodeproj`; `ios/App/CapApp-SPM/Package.swift` declares its Swift Package Manager Capacitor dependency. Web assets have been copied into `ios/App/App/public`. Project generation and web synchronization succeeded; no Xcode build, signing, simulator run or device run was tested in this Windows delivery. On a Mac with the Xcode version required by the installed [Capacitor iOS release](https://capacitorjs.com/docs/ios):

```sh
npm install
npm run build
npm run ios:sync
npx cap open ios
```

Do not run `npx cap add ios` for this existing checkout; it is only needed when creating/regenerating a missing iOS project. Web changes use `npm run build` and `npm run ios:sync`. Configure a unique bundle ID, signing team, capabilities and permission descriptions in Xcode. Test the simulator and a physical iPhone. Native storage is separate from the existing Safari PWA origin; use an explicit backup transfer or implement a migration path.

HealthKit, Watch, App Intents/Siri, native Foundation Models, Live Activities/Dynamic Island, guaranteed local notifications and native Spotify App Remote require actual plugins/native code, permission work and independent tests. The capability adapter currently marks them unavailable.

App Store distribution requires Apple Developer Program enrollment, appropriate signing, App Store Connect metadata/screenshots, a deployment-specific privacy policy and disclosures, privacy manifests as applicable, rights/attribution review, native device testing and Apple's review. No enrollment or purchase was made by this project, and approval is not guaranteed. Personal PWA use avoids that distribution process entirely.
