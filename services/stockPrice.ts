/**
 * KRATOS — Real-time Stock Price Service
 * Primary: Yahoo Finance v7 quote API (comprehensive, includes marketCap)
 * Fallback: Yahoo Finance v8 chart API
 */

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  priceFormatted: string;
  changePercent: number;
  changePercentFormatted: string;
  change: number;
  changeFormatted: string;
  exchange: string;
  tradingViewSymbol: string;
  marketCap?: string;    // undefined when not available — allows ?? fallback in JSX
  currency: string;
}

function toExchangeCode(name: string): string {
  const n = (name ?? '').toUpperCase();
  if (n.includes('NASDAQ') || ['NMS','NGM','NCM','NAS'].includes(n)) return 'NASDAQ';
  if (n.includes('NYSE')   || ['NYQ','NYS'].includes(n))             return 'NYSE';
  if (['PCX','ASE','AMX','AMEX'].includes(n))                        return 'AMEX';
  if (n.includes('LSE'))  return 'LSE';
  if (n.includes('TSX'))  return 'TSX';
  return n;
}

function fmtCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toFixed(0)}`;
}

const _cache = new Map<string, { data: StockQuote; ts: number }>();
const TTL = 60 * 1000;

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const key = ticker.toUpperCase();
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  // Try v7 quote API first — most comprehensive
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${key}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
    );
    if (res.ok) {
      const json = await res.json();
      const q = json?.quoteResponse?.result?.[0];
      if (q) {
        const price     = q.regularMarketPrice ?? 0;
        const prevClose = q.regularMarketPreviousClose ?? price;
        const change    = price - prevClose;
        const changePct = prevClose ? (change / prevClose) * 100 : 0;
        const exc       = toExchangeCode(q.fullExchangeName ?? q.exchange ?? '');

        const quote: StockQuote = {
          ticker:                  key,
          name:                    q.longName ?? q.shortName ?? key,
          price,
          priceFormatted:          `$${price.toFixed(2)}`,
          change,
          changeFormatted:         `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)}`,
          changePercent:           changePct,
          changePercentFormatted:  `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
          exchange:                exc,
          tradingViewSymbol:       exc ? `${exc}:${key}` : key,
          marketCap:               q.marketCap ? fmtCap(q.marketCap) : undefined,
          currency:                q.currency ?? 'USD',
        };
        _cache.set(key, { data: quote, ts: Date.now() });
        return quote;
      }
    }
  } catch {
    // fall through to v8 chart
  }

  // Fallback: v8 chart API
  const res = await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${key}?interval=1d&range=2d&includePrePost=false`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${key}`);

  const json   = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data found for ${key}`);

  const meta      = result.meta;
  const price     = meta.regularMarketPrice ?? 0;
  const prevClose = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price;
  const change    = price - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;
  const exc       = toExchangeCode(meta.exchangeName ?? meta.fullExchangeName ?? '');

  const quote: StockQuote = {
    ticker:                  key,
    name:                    meta.longName ?? meta.shortName ?? key,
    price,
    priceFormatted:          `$${price.toFixed(2)}`,
    change,
    changeFormatted:         `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)}`,
    changePercent:           changePct,
    changePercentFormatted:  `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
    exchange:                exc,
    tradingViewSymbol:       exc ? `${exc}:${key}` : key,
    marketCap:               meta.marketCap ? fmtCap(meta.marketCap) : undefined,
    currency:                meta.currency ?? 'USD',
  };

  _cache.set(key, { data: quote, ts: Date.now() });
  return quote;
}
