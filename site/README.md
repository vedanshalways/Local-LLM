# Local Graph — landing page

A static React (Vite) site with the download links for each platform.

```bash
cd site
npm install
npm run dev        # http://localhost:5173
npm run build      # static files in site/dist
npm run preview    # serve the build locally
```

## Pointing it at a release

`src/config.js` holds everything version- and repo-specific:

```js
export const VERSION = '1.0.0'
export const REPO = 'https://github.com/vedanshalways/Local-LLM'
```

Download URLs are built as
`<REPO>/releases/download/v<VERSION>/LocalGraph-<VERSION>-<os>-<arch>.<ext>`, which is
exactly what `.github/workflows/build.yml` attaches to the release for tag `v<VERSION>`.

**The links 404 until that release exists and is published** (the workflow creates it as a
*draft*). To make them live:

```bash
git tag v1.0.0 && git push --tags     # builds all 3 platforms, drafts a release
```

then publish the draft on GitHub. When you bump `version` in the app's `package.json`,
bump `VERSION` here to match.

## Deploying

`vite.config.mjs` sets `base: './'`, so `site/dist` works unchanged at a domain root or
under a GitHub Pages project path (`/Local-LLM/`).

- **GitHub Pages:** push `site/dist` to a `gh-pages` branch, or add a workflow that runs
  `npm ci && npm run build` in `site/` and uploads `site/dist` with `actions/deploy-pages`.
- **Netlify / Vercel / Cloudflare Pages:** base directory `site`, build command
  `npm run build`, output directory `dist`.

## Notes

- The hero screenshot is CSS, not an image — it stays sharp at any size and can't go stale.
- Platform detection only reorders the buttons; every download stays reachable, and macOS
  arm64/x64 are always both offered because the browser can't tell them apart reliably.
