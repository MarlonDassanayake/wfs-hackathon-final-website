/**
 * ALETHEIA — Client-side API wrappers
 * All functions call Next.js API routes (same origin) — no CORS issues.
 */

import type {
  LandingData, StockAnalysis, ContrarianEdge, ChatMessage, HedgeRecommendation,
} from '@/services/gemini';
import type { StockQuote } from '@/services/stockPrice';
import type { FearGreedData, RedditPost, NewsItem, XPulseItem } from '@/services/social';
import type { PortfolioStockData } from '@/services/portfolioService';

// ── Client-side cache (5-min TTL) ─────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCache<T>(key: string): T | null {
  const e = _cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return e.data as T;
}
function setCache(key: string, data: unknown) { _cache.set(key, { data, ts: Date.now() }); }

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Gemini — Stock Analysis ───────────────────────────────────────────────────
export async function getLandingData(): Promise<LandingData> {
  const key = 'landing';
  const cached = getCache<LandingData>(key);
  if (cached) return cached;
  const data = await apiPost<LandingData>('/api/gemini', { action: 'landing' });
  setCache(key, data);
  return data;
}

export async function analyzeStock(
  ticker: string,
  realPrice?: string,
  recommendationHint?: 'SHORT' | 'LONG' | 'HOLD',
): Promise<StockAnalysis> {
  const key = `stock_${ticker.toUpperCase()}`;
  const cached = getCache<StockAnalysis>(key);
  if (cached) return cached;
  const data = await apiPost<StockAnalysis>('/api/gemini', { action: 'analyze', ticker, realPrice, recommendationHint });
  setCache(key, data);
  return data;
}

export async function fetchContrarianAnalysis(
  ticker: string,
  stockData: StockAnalysis,
): Promise<ContrarianEdge> {
  const key = `contrarian_${ticker.toUpperCase()}`;
  const cached = getCache<ContrarianEdge>(key);
  if (cached) return cached;
  const data = await apiPost<ContrarianEdge>('/api/gemini', { action: 'contrarian', ticker, stockData });
  setCache(key, data);
  return data;
}

export async function chatWithKratos(
  ticker: string,
  question: string,
  stockData: StockAnalysis,
  contrarian: ContrarianEdge | null,
  history: ChatMessage[],
): Promise<string> {
  const res = await apiPost<{ reply: string }>('/api/gemini', {
    action: 'chat', ticker, question, stockData, contrarian, history,
  });
  return res.reply;
}

export async function generateHedgeRecommendations(
  portfolio: { ticker: string; sector: string; weight: number; beta: number }[],
  metrics: { beta: number; volatility: number; sharpe: number; sectorConcentration: Record<string, number> },
): Promise<HedgeRecommendation> {
  return apiPost<HedgeRecommendation>('/api/gemini', { action: 'hedge', portfolio, metrics });
}

// ── Stock Quote ───────────────────────────────────────────────────────────────
export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const key = `quote_${ticker.toUpperCase()}`;
  const cached = getCache<StockQuote>(key);
  if (cached) return cached;
  const data = await apiGet<StockQuote>(`/api/quote?ticker=${encodeURIComponent(ticker.toUpperCase())}`);
  setCache(key, data);
  return data;
}

// ── Social Data ───────────────────────────────────────────────────────────────
export async function fetchFearGreed(): Promise<FearGreedData> {
  const key = 'feargreed';
  const cached = getCache<FearGreedData>(key);
  if (cached) return cached;
  const data = await apiPost<FearGreedData>('/api/social', { action: 'feargreed' });
  setCache(key, data);
  return data;
}

export async function fetchRedditPosts(): Promise<RedditPost[]> {
  const key = 'reddit';
  const cached = getCache<RedditPost[]>(key);
  if (cached) return cached;
  const data = await apiPost<RedditPost[]>('/api/social', { action: 'reddit' });
  setCache(key, data);
  return data;
}

export async function fetchMarketNews(): Promise<NewsItem[]> {
  const key = 'news';
  const cached = getCache<NewsItem[]>(key);
  if (cached) return cached;
  const data = await apiPost<NewsItem[]>('/api/social', { action: 'news' });
  setCache(key, data);
  return data;
}

export async function fetchXPulse(): Promise<XPulseItem[]> {
  const key = 'xpulse';
  const cached = getCache<XPulseItem[]>(key);
  if (cached) return cached;
  const data = await apiPost<XPulseItem[]>('/api/social', { action: 'xpulse' });
  setCache(key, data);
  return data;
}

// ── Portfolio Stock Data ──────────────────────────────────────────────────────
export async function fetchPortfolioStockData(ticker: string): Promise<PortfolioStockData> {
  const key = `portfolio_${ticker.toUpperCase()}`;
  const cached = getCache<PortfolioStockData>(key);
  if (cached) return cached;
  const data = await apiGet<PortfolioStockData>(`/api/portfolio-stock?ticker=${encodeURIComponent(ticker.toUpperCase())}`);
  setCache(key, data);
  return data;
}
