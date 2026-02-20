# Portfolio Site (Vite + React + TypeScript)

One-page portfolio starter with sections for hero, selected work, about, and contact.

## Run locally

```bash
npm install
npm run dev
```

## Build for production

```bash
npm run build
npm run preview
```

## Customize content

- Update your name, headline, and intro in `src/App.tsx`
- Replace project cards in the `featuredProjects` array in `src/App.tsx`
- Update skills and contact email in `src/App.tsx`
- Adjust visual style in `src/App.css`

## Deploy to Vercel

1. Push this folder to a GitHub repository
2. In Vercel, click **New Project** and import the repo
3. Confirm settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Deploy

Vite + React apps work on Vercel without extra config files.

## Global counters + leaderboard (Upstash)

This project includes Vercel API routes for:

- Global page views (`/api/views`)
- Global likes/hearts (`/api/likes`)
- Game leaderboard (`/api/leaderboard`)

Required environment variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If you connected Upstash via Vercel Marketplace, these are usually added automatically.

Note for local development:

- `vite dev` does not run Vercel API functions.
- APIs work in deployed Vercel environments (or when using Vercel local tooling).
