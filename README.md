# 🎬 Random Restaurant

Pick a few movies and a location, and get a restaurant. Your movie taste is sent
to the [Qloo Taste API](https://docs.qloo.com/reference/api-overview), whose
cross-domain graph maps cultural taste → restaurant affinity. A **three.js** drum
spins and lands on your pick.

**[Live demo →](https://random-restaurant-iota.vercel.app)**

## How it works

1. **Pick a location and a few movies you love.** Anonymous sign-in happens in
   the background; no account needed.
2. **The server asks Qloo** for restaurants near that location sharing taste
   affinity with your movies. The API key never reaches the browser.
3. **A three.js drum spins** and settles on one of the top matches.
4. **You get the pick** with its latitude/longitude — which open in your device's
   navigation app — and you can save it to your favourites.

No embedded map and no Maps API key.

## Repo layout

| Path | What it is |
| --- | --- |
| [`appfiles/`](appfiles) | the Next.js application |
| [`appfiles/README.md`](appfiles/README.md) | app-level docs: setup, env vars, Firebase, Qloo notes |
| `.gitignore` | repo-root ignores |

The app lives in `appfiles/` rather than the repo root, and that directory is also
the Vercel project's **Root Directory**.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **three.js** — the spinner
- **Qloo Taste API** (hackathon server) — server-side only
- **Firebase** Anonymous Auth + Cloud Firestore — favourites
- **Vercel** — hosting, Git-connected

## Notable details

- **The spinner is three.js**, dynamically imported so it stays out of the server
  bundle. The drum creates its own `<canvas>`, because a canvas yields exactly one
  WebGL context for its lifetime and React Strict Mode double-invokes effects in
  development.
- **The drum's card labels are theme-aware and contrast-checked.** The drum sits on
  the page background rather than a fixed backdrop, so a hard-coded white label was
  invisible in light mode. Measured well above the WCAG AA 4.5:1 threshold
  (≥5.8:1 light, ≥15:1 dark).
- **Coordinates open *your* navigation app**, not a website: `geo:` on Android
  (resolved by your default maps app), Apple Maps on iOS (repointable to another
  app from iOS 18.4), and Google Maps as the universal fallback.
- **Favourites are per-user** at `users/{uid}/favorites`, with rules in
  [`appfiles/firestore.rules`](appfiles/firestore.rules). Firebase is optional: with
  no config the app runs and simply hides the favourites UI.

## Deployment

Connected to GitHub — pushing to `main` deploys to production, and pull requests
get preview builds. There is no manual deploy step.

Two settings make that work:

- **Root Directory** = `appfiles`, required because there is no `package.json` at
  the repo root.
- Environment variables for **Production and Preview**: `QLOO_API_URL`,
  `QLOO_API_KEY` (server-side only), and the `NEXT_PUBLIC_FIREBASE_*` web config.

## Development

See [`appfiles/README.md`](appfiles/README.md) for local setup, environment
variables, Firebase configuration, and hard-won Qloo API notes.
