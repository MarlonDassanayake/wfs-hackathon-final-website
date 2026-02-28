# ALETHEIA — Claude Operating Instructions

## Project Overview
ALETHEIA is a contrarian investment intelligence web app. It is a **Next.js 15 website** located at `apps/nextjs/`. It was converted from an Expo/React Native app. The root directory also contains the original mobile app source (ignored for web purposes).

---

## Directory Structure

```
/Users/marlondassanayake/Desktop/wfs-hackathon-website-final/
├── apps/
│   └── nextjs/                  ← THE WEBSITE (work here)
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx            Dashboard (landing picks + search)
│       │   │   ├── social/page.tsx     Fear & Greed, News, Reddit, X Pulse
│       │   │   ├── portfolio/page.tsx  Portfolio builder + hedge recommendations
│       │   │   ├── about/page.tsx      Brand info + philosophy
│       │   │   ├── stock/[ticker]/page.tsx  Stock analysis detail page
│       │   │   └── api/
│       │   │       ├── gemini/route.ts       Gemini AI (all actions)
│       │   │       ├── quote/route.ts        Yahoo Finance stock price
│       │   │       ├── social/route.ts       Fear/Greed, Reddit, News, X Pulse
│       │   │       └── portfolio-stock/route.ts  Portfolio stock data
│       │   ├── components/
│       │   │   └── NavBar.tsx
│       │   └── services/
│       │       ├── clientApi.ts        ← CLIENT-SIDE WRAPPERS (import from here in pages)
│       │       ├── gemini.ts           Type definitions only (do not call directly from pages)
│       │       ├── social.ts           Type definitions only
│       │       ├── stockPrice.ts       Type definitions only
│       │       └── portfolioService.ts Type definitions + calculatePortfolioMetrics (pure fn)
│       ├── .env.local                  API keys (gitignored)
│       └── package.json
└── CLAUDE_INSTRUCTIONS.md       ← THIS FILE
```

---

## How to Start the Dev Server

**Working directory:** `/Users/marlondassanayake/Desktop/wfs-hackathon-website-final/apps/nextjs`

```bash
npm run dev
```

The server starts at **http://localhost:3000** (or next available port if 3000 is taken).

---

## Environment Variables

File: `apps/nextjs/.env.local`

```
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyALDFW5USFMQBFF9G-90Xx3jDhDaMEFKSw
GEMINI_API_KEY=AIzaSyALDFW5USFMQBFF9G-90Xx3jDhDaMEFKSw
```

- `GEMINI_API_KEY` — used by server-side API routes (never exposed to browser)
- `NEXT_PUBLIC_GEMINI_API_KEY` — legacy key kept for type compatibility; not used for API calls

If the API key stops working the user will need to provide a new one. Update both values in `.env.local`.

---

## Gemini Model

All three API routes use: **`gemini-2.5-flash`**

Files to update if the model changes:
- `src/app/api/gemini/route.ts` — `const MODEL = 'gemini-2.5-flash'`
- `src/app/api/social/route.ts` — `const MODEL = 'gemini-2.5-flash'`
- `src/app/api/portfolio-stock/route.ts` — `const MODEL = 'gemini-2.5-flash'`

The previous model `gemini-2.0-flash` was deprecated. If a 404 model error appears again, check the current model name at: https://ai.google.dev/gemini-api/docs/models

---

## Architecture — Critical Rule

**Pages (`'use client'`) must NEVER import API-calling functions from service files directly.**

All pages import API functions from `@/services/clientApi` which calls Next.js API routes (same-origin — no CORS). Types-only imports from original service files are fine.

```
Browser page  →  /api/gemini (server)  →  Gemini API
              →  /api/quote (server)   →  Yahoo Finance
              →  /api/social (server)  →  alternative.me / Reddit / Gemini
              →  /api/portfolio-stock  →  Yahoo Finance + Gemini
```

If external API calls are ever placed directly in `'use client'` components, they will fail with "Failed to fetch" due to CORS.

---

## Build

```bash
npm run build   # from apps/nextjs/
```

Produces optimised static + server output. Check for TypeScript errors before building.

---

## Pages & Features

| Route | Feature |
|---|---|
| `/` | Dashboard: TOP SHORTS / TOP LONGS picks, stock search |
| `/stock/[ticker]` | Full analysis: SHORT/LONG/IMPACT/ANALYSIS tabs, TradingView chart, AI chat |
| `/social` | Fear & Greed gauge, market news, Reddit posts, X Pulse |
| `/portfolio` | Portfolio builder, risk metrics (β, σ, Sharpe, Alpha), hedge recommendations |
| `/about` | Brand info, investment philosophy, scoring grades |

---

## API Routes Summary

### `POST /api/gemini`
Body: `{ action: string, ...params }`

| action | params | returns |
|---|---|---|
| `landing` | — | `{ top_shorts, top_longs, market_news }` |
| `analyze` | `ticker, realPrice?, recommendationHint?` | Full `StockAnalysis` |
| `contrarian` | `ticker, stockData` | `ContrarianEdge` |
| `chat` | `ticker, question, stockData, contrarian, history` | `{ reply: string }` |
| `hedge` | `portfolio, metrics` | `HedgeRecommendation` |
| `beta` | `ticker` | `{ beta: number }` |

### `GET /api/quote?ticker=AAPL`
Returns `StockQuote` with live price, change, exchange, market cap.

### `POST /api/social`
Body: `{ action: 'feargreed' | 'reddit' | 'news' | 'xpulse' }`

### `GET /api/portfolio-stock?ticker=AAPL`
Returns `{ quote, beta, sector, volatility }`.

---

## Common Issues & Fixes

| Error | Cause | Fix |
|---|---|---|
| `Failed to fetch` on any feature | CORS — API call made from browser directly | Ensure functions are imported from `clientApi.ts`, not service files |
| Gemini 404 model error | Model name deprecated | Update `MODEL` constant in all 3 API route files to current model |
| `GEMINI_API_KEY not configured` | Missing `.env.local` | Create/update `apps/nextjs/.env.local` with both key vars |
| Port already in use | Previous server still running | Next.js auto-picks next port; or kill the process on 3000 |
| ESLint config warning during build | Non-fatal eslint config issue | Build still completes successfully; can be ignored |

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v3 + inline styles
- **Icons:** lucide-react
- **AI:** Google Gemini API (REST, server-side only)
- **Stock data:** Yahoo Finance v7/v8 (server-side only)
- **Social data:** alternative.me (Fear & Greed), Reddit public JSON API
- **Charts:** TradingView widget (embedded via iframe srcDoc)
- **Language:** TypeScript
