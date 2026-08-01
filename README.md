# Nekos APIs

A TypeScript web app that consumes the [nekos.best](https://nekos.best) API v2 and [nekosapi](https://nekosapi.com) API, with a reusable TS client library. Deployable to Vercel.

## Features

- **Surprise me** — get a random image/GIF from either provider
- **Search** — search by query, tags, type, category, rating
- **Get specific item** — fetch a specific asset by ID or filename
- **Provider switching** — toggle between nekos.best and nekosapi
- **"All" option** — fetch all results (nekosapi paginates automatically; nekos.best caps at 20)
- **Type filtering** — category dropdown filters by images/GIFs to prevent type mismatch

## Tech Stack

- TypeScript + Vite
- Deployed on Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with API proxy |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |

## Project Structure

```
src/
  lib/
    types.ts        Provider interface, SearchParams, ProviderResult
    util.ts          Error classes, buildQuery, helpers
    nekosBest.ts     NekosBestClient (nekos.best API v2)
    nekosapi.ts      NekosApiClient (nekosapi API v4)
    index.ts         createProvider factory, re-exports
  main.ts            UI logic, event handlers, rendering
  style.css          Layout, skeleton loading, animations
index.html           App shell with search/surprise/asset forms
vite.config.ts       Dev proxy for /api/nekos-best and /api/nekosapi
vercel.json          Vercel rewrite rules for both API proxies
public/assets/       Favicon and provider logos
```

## API Proxy

All API requests go through a proxy to avoid CORS issues and supply the required `User-Agent` header.

| Frontend path | Upstream |
|---|---|
| `/api/nekos-best/*` | `https://nekos.best/api/v2/*` |
| `/api/nekosapi/*` | `https://api.nekosapi.com/v4/*` |

In dev, Vite handles the proxy (`vite.config.ts`). In production, Vercel rewrites handle it (`vercel.json`).

## Client Library (`src/lib/`)

The `src/lib/` directory is a standalone TS client library. You can import it directly:

```ts
import { createProvider, type Provider } from "./lib";

const provider: Provider = createProvider("nekos-best");

// Random image
const [result] = await provider.getRandom("neko", 1);
console.log(result.url);

// Search
const { items } = await provider.search({ query: "cat", type: 1, amount: 10 });

// Specific item (nekos.best)
const asset = await provider.getSpecific({ category: "neko", filename: "uuid-here", format: "png" });

// Specific item (nekosapi)
const asset = await provider.getSpecific({ id: "5845" });

// Get all endpoints (nekos.best)
const endpoints = await provider.getEndpoints();
// { neko: "png", pat: "gif", ... }
```

## Providers

| Provider | Base URL | Search | Pagination | Rate Limit |
|---|---|---|---|---|
| nekos.best | `api/v2` | `/search?query=&type=&category=&amount=` | None (max 20) | 7 req / 5s |
| nekosapi | `v4` | `/images?tags=&rating=&limit=&offset=` | `offset` param | 1 req / 0.5s |

### nekos.best categories

- **Images (PNG):** `neko`, `waifu`, `husbando`, `kitsune`
- **GIFs:** `angry`, `baka`, `bite`, `blush`, `bonk`, `cry`, `hug`, `pat`, `poke`, `slap`, and 40+ more

### nekosapi

- Search by tags (comma-delimited), rating, and limit
- Paginates automatically when "All" is selected

## Deployment

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Vercel auto-detects the project and deploys with the rewrite rules in `vercel.json`

## License

MIT
