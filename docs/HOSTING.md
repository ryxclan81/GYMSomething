# Hosting Setwise

Setwise builds to static HTML, CSS and JavaScript in `dist`. GitHub Pages is suitable for its training, planning, progress, nutrition and offline features. No database or server is required; the deployed files contain the app and bundled exercise library, while personal records stay in the browser's local storage. GitHub describes Pages as a [static site hosting service](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## GitHub Pages project

The intended repository is `ryxclan81/GYMSomething`. Its expected project URL is [https://ryxclan81.github.io/GYMSomething/](https://ryxclan81.github.io/GYMSomething/), once Pages is enabled and the deployment succeeds. Creating this configuration does not publish the site or change repository visibility.

GitHub Free supports Pages in public repositories. A private repository needs an eligible paid plan. The website is normally public even when its source repository is private; private website access is a separate enterprise feature. Check the repository's Pages availability and intended website visibility before deployment. See [Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [publishing source and visibility](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

1. Keep `pnpm-lock.yaml` committed with the source. The workflow installs pnpm **11.25.0**, the version used by this checkout, and uses `--frozen-lockfile`. It runs on Node.js **24 LTS**, which satisfies this project's Node requirement. See [Node release support](https://nodejs.org/en/about/previous-releases) and [pnpm's setup action](https://github.com/pnpm/action-setup).
2. In the repository, open **Settings → Pages → Build and deployment → Source**, and choose **GitHub Actions**. Preserve the chosen repository and site privacy. The workflow explicitly does not enable Pages on the owner's behalf.
3. Ensure the default branch is `main`, or update the workflow's `push.branches`. Push the reviewed source to that branch or run **Deploy Setwise to GitHub Pages** from Actions. Only the default branch may deploy.
4. The build job checks types, lint and unit tests, then builds before reading the Pages configuration. After these pass and Pages is available, it uploads only `dist`. The separate deploy job uses the `github-pages` environment and the required Pages/OIDC permissions. See [GitHub's custom workflow requirements](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
5. Check the deployment URL from the Actions run or **Settings → Pages → Visit site**. Use HTTPS, including the trailing `/GYMSomething/` path. Do not upload the source directory or `node_modules` as the site.

The workflow pins action commits from the current [official Vite Pages example](https://vite.dev/guide/static-deploy.html#github-pages), with a separately verified pnpm setup release. Update those pins deliberately when maintaining CI.

## Build paths and local verification

`VITE_BASE_PATH` controls Vite asset URLs, the manifest's launch URL/scope and the service worker's scope. It defaults to `/` for local development, standalone hosting and native packaging. A project deployment needs `/GYMSomething/`, as described in [Vite's deployment guide](https://vite.dev/guide/static-deploy.html#github-pages). The workflow derives `/<repository-name>/` automatically. A repository Actions variable named `VITE_BASE_PATH` can override it; set it to `/` for a custom domain.

Use Node 24 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
VITE_BASE_PATH=/GYMSomething/ pnpm build
VITE_BASE_PATH=/GYMSomething/ pnpm preview --host 127.0.0.1 --port 4184
```

PowerShell uses an environment assignment instead:

```powershell
$env:VITE_BASE_PATH = '/GYMSomething/'
pnpm build
pnpm preview --host 127.0.0.1 --port 4184
# Clear this before a root-path or native build.
Remove-Item Env:VITE_BASE_PATH
```

Visit `http://127.0.0.1:4184/GYMSomething/`. Confirm the app renders, icons load, and the manifest has `start_url` and `scope` equal to `/GYMSomething/`. Its relative icon paths resolve beneath the same project path. Wait for the service worker to install, reload once so it controls the page, then use browser DevTools to go offline and reload again. Save a set, reopen and confirm it persists. Vite preview is a local verification server, not a production host.

The generated worker precaches the bundled scripts, styles, HTML, icons and manifest. Offline use needs one completed online installation first; remote exercise media and optional network integrations still need connectivity. See [PWA manifest requirements](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements) and [service worker precaching](https://vite-pwa-org.netlify.app/guide/service-worker-precache). The app uses in-app navigation at the site entry URL, so it does not require a server-side route rewrite or a custom `404.html`.

Local preparation was verified on 2026-10-11 with Node 24.19.0 and a separate `/GYMSomething/` production build. Chrome loaded the manifest, all three manifest icons, touch icon and favicon beneath that path; the worker registered with the same project scope. An offline workout set survived a full offline reload and resume, with no page errors or missing assets. Type checking, config lint and formatting passed. This verifies the static artifact locally; GitHub Pages account eligibility and an actual remote deployment still need their own confirmation.

## Local records and updates

The Setwise display rebrand preserves existing `forma.*` storage and Spotify keys. Changing an origin (for example, localhost to `github.io`, or `github.io` to a custom domain) creates a separate browser storage area. Export a backup from Settings on the old origin and restore it on the new one to move records. Publishing app files does not synchronize fitness records between devices or upload them to GitHub.

After an app update, finish the active workout before closing all tabs and reopening when the app reports that a new version is ready. Do not clear site storage to update the app; that removes local records. Keep periodic backups.

## Optional integrations

Spotify uses a browser PKCE flow with a public Client ID and no client secret. Register the exact callback URL `https://ryxclan81.github.io/GYMSomething/` in the Spotify developer app, matching the URL shown in Setwise Settings. The callback uses the current origin and pathname, retains the project path, and removes authorization parameters after processing. A custom domain requires its own matching callback entry. See Spotify's [PKCE guide](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow) and [redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri). Playback control still depends on Spotify's account/developer-app requirements.

AI is disabled until the user explicitly enables and configures it. GitHub Pages cannot execute `/api/...` endpoints. On this deployment, configure a complete HTTPS endpoint if adding an AI provider; same-origin paths intentionally start at the hostname root, not at the Vite base. The endpoint accepts a JSON POST containing `{ question, context }` and must return `{ answer: string }`. Cross-origin endpoints must permit the app's origin and JSON POST through CORS.

Only add a server service, such as a Cloudflare Worker, for an integration that requires provider secrets, controlled quota or server authentication. Keep provider keys in [Worker secret bindings](https://developers.cloudflare.com/workers/configuration/secrets/), add authentication/rate limits and explicit origin handling, and leave workouts locally stored. Never put provider secrets into a `VITE_*` variable, source file, browser storage or static GitHub Pages artifact. A Worker and database are not required for the core app, and this repository does not provision either.
