# 🎬 Random Restaurant

Spin a random restaurant matched to your **movie taste**. Preference signals
(movies you love) are sent to the [Qloo Taste API](https://docs.qloo.com/reference/api-overview),
whose cross-domain graph maps cultural taste → restaurant affinity. A pure-CSS 3D
carousel spins and lands on your pick, shown with **latitude/longitude** (no maps).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS 4**
- **Qloo Insights API** (hackathon server) — server-side only
- **Firebase** Anonymous Auth + Cloud Firestore favorites
- **Vercel** deployment

## Architecture

```
app/
  page.tsx                  # client orchestrator: preferences → spin → reveal
  api/movies/route.ts       # GET  movie search (Qloo /search)
  api/restaurants/route.ts  # POST restaurant pool (Qloo /v2/insights)
components/
  PreferencePicker.tsx      # location + movie multi-select
  Spinner3D.tsx             # pure-CSS 3D carousel reveal
  RestaurantCard.tsx        # reveal card with lat/long + save
lib/
  qloo/{types,query,client,config}.ts   # typed, pure, DI service layer
  firebase/{client,favorites,use-favorites}.ts
firestore.rules             # per-user favorites security rules
```

**Flow:** anonymous sign-in → pick location + movies → server route queries Qloo
insights (key never leaves the server) → random pick from the top matches → 3D
spinner lands on it → save to Firestore.

## Local setup

```bash
cd appfiles
npm install
npm run dev
```

### Environment (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `QLOO_API_URL` | `https://hackathon.api.qloo.com` |
| `QLOO_API_KEY` | Qloo API key (**server-side only**) |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config (safe to expose) |

## Firebase setup

1. **Authentication** → Sign-in method → enable **Anonymous**.
2. **Firestore Database** → Create database (**production mode**).
3. **Firestore → Rules** → paste `firestore.rules` → Publish.
4. **Project settings → Your apps → Web (`</>`)** → register app → copy the
   `firebaseConfig` values into `NEXT_PUBLIC_FIREBASE_*` in `.env.local`.

Firebase is optional at runtime: with no config the app runs and simply hides the
save/favorites UI.

## Deploy to Vercel

Set the project **Root Directory** to `appfiles`, then add the same environment
variables in Vercel → Project → Settings → Environment Variables.

## Qloo API notes (learned the hard way)

- Use `filter.location.query` for places — `signal.location.query` hangs when
  combined with `filter.tags`.
- Invalid parameters are **silently ignored**; verify against the entity-type guide.
- `primary_genre` / `cuisine_description` / `price_level` are inconsistently typed
  (string \| object \| number) — normalise before use.
- `urn:entity:place` returns *all* places; restrict with
  `filter.tags=urn:tag:genre:place:restaurant` plus a food-genre predicate.
