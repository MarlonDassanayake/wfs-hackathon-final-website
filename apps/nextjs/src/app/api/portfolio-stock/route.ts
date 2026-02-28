import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const MODEL    = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ── Known sector map ──────────────────────────────────────────────────────────
const KNOWN_SECTORS: Record<string, string> = {
  AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', AMD:'Technology',
  INTC:'Technology', TSM:'Technology', AVGO:'Technology', QCOM:'Technology',
  ORCL:'Technology', CRM:'Technology', ADBE:'Technology', NOW:'Technology',
  SNOW:'Technology', PLTR:'Technology', DDOG:'Technology', NET:'Technology',
  CRWD:'Technology', PANW:'Technology', ZS:'Technology', OKTA:'Technology',
  MU:'Technology', LRCX:'Technology', KLAC:'Technology', AMAT:'Technology',
  MRVL:'Technology', SMCI:'Technology', DELL:'Technology', IBM:'Technology',
  INTU:'Technology', FTNT:'Technology', ACN:'Technology', TXN:'Technology',
  ANET:'Technology', CDNS:'Technology', SNPS:'Technology', HUBS:'Technology',
  SHOP:'Technology', AI:'Technology',
  GOOGL:'Communication Services', GOOG:'Communication Services',
  META:'Communication Services', NFLX:'Communication Services',
  DIS:'Communication Services', T:'Communication Services',
  VZ:'Communication Services', TMUS:'Communication Services',
  SNAP:'Communication Services', PINS:'Communication Services',
  RDDT:'Communication Services', SPOT:'Communication Services',
  ROKU:'Communication Services', EA:'Communication Services',
  RBLX:'Communication Services',
  AMZN:'Consumer Discretionary', TSLA:'Consumer Discretionary',
  HD:'Consumer Discretionary', MCD:'Consumer Discretionary',
  NKE:'Consumer Discretionary', SBUX:'Consumer Discretionary',
  LOW:'Consumer Discretionary', TGT:'Consumer Discretionary',
  BKNG:'Consumer Discretionary', ABNB:'Consumer Discretionary',
  CMG:'Consumer Discretionary', F:'Consumer Discretionary',
  GM:'Consumer Discretionary', RIVN:'Consumer Discretionary',
  DKNG:'Consumer Discretionary',
  WMT:'Consumer Staples', PG:'Consumer Staples', KO:'Consumer Staples',
  PEP:'Consumer Staples', COST:'Consumer Staples', PM:'Consumer Staples',
  MO:'Consumer Staples',
  JPM:'Financial Services', BAC:'Financial Services', WFC:'Financial Services',
  GS:'Financial Services', MS:'Financial Services', C:'Financial Services',
  AXP:'Financial Services', V:'Financial Services', MA:'Financial Services',
  BLK:'Financial Services', SCHW:'Financial Services', COIN:'Financial Services',
  SQ:'Financial Services', PYPL:'Financial Services', SOFI:'Financial Services',
  JNJ:'Healthcare', UNH:'Healthcare', PFE:'Healthcare',
  ABBV:'Healthcare', MRK:'Healthcare', LLY:'Healthcare',
  TMO:'Healthcare', ABT:'Healthcare', AMGN:'Healthcare',
  GILD:'Healthcare', MRNA:'Healthcare', REGN:'Healthcare',
  VRTX:'Healthcare', ISRG:'Healthcare', CVS:'Healthcare',
  XOM:'Energy', CVX:'Energy', COP:'Energy', SLB:'Energy',
  EOG:'Energy', OXY:'Energy', BP:'Energy',
  BA:'Industrials', CAT:'Industrials', HON:'Industrials',
  UPS:'Industrials', FDX:'Industrials', LMT:'Industrials',
  RTX:'Industrials', GE:'Industrials', DE:'Industrials',
  UBER:'Industrials', LYFT:'Industrials',
  AMT:'Real Estate', PLD:'Real Estate', EQIX:'Real Estate',
  NEE:'Utilities', DUK:'Utilities', SO:'Utilities',
  LIN:'Basic Materials', NEM:'Basic Materials', FCX:'Basic Materials',
  SPY:'ETF', QQQ:'ETF', IWM:'ETF', DIA:'ETF',
  VTI:'ETF', VOO:'ETF', VGT:'ETF', XLK:'ETF',
  XLF:'ETF', XLE:'ETF', ARKK:'ETF', SQQQ:'ETF', TQQQ:'ETF',
  GLD:'Commodities', SLV:'Commodities', USO:'Commodities',
  TLT:'Fixed Income', IEF:'Fixed Income', AGG:'Fixed Income',
};

function toExchangeCode(name: string): string {
  const n = (name ?? '').toUpperCase();
  if (n.includes('NASDAQ') || ['NMS','NGM','NCM','NAS'].includes(n)) return 'NASDAQ';
  if (n.includes('NYSE')   || ['NYQ','NYS'].includes(n))             return 'NYSE';
  if (['PCX','ASE','AMX','AMEX'].includes(n))                        return 'AMEX';
  return n;
}

function fmtCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toFixed(0)}`;
}

async function fetchQuote(ticker: string) {
  // Try v7 first
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`,
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
        return {
          ticker,
          name:                    q.longName ?? q.shortName ?? ticker,
          price,
          priceFormatted:          `$${price.toFixed(2)}`,
          change,
          changeFormatted:         `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)}`,
          changePercent:           changePct,
          changePercentFormatted:  `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
          exchange:                exc,
          tradingViewSymbol:       exc ? `${exc}:${ticker}` : ticker,
          marketCap:               q.marketCap ? fmtCap(q.marketCap) : undefined,
          currency:                q.currency ?? 'USD',
        };
      }
    }
  } catch { /* fall through */ }

  // Fallback v8
  const res = await fetch(
    `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d&includePrePost=false`,
    { headers: { 'User-Agent': 'Mozilla/5.0' } },
  );
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${ticker}`);
  const json   = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data found for ${ticker}`);
  const meta      = result.meta;
  const price     = meta.regularMarketPrice ?? 0;
  const prevClose = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price;
  const change    = price - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;
  const exc       = toExchangeCode(meta.exchangeName ?? meta.fullExchangeName ?? '');
  return {
    ticker,
    name:                    meta.longName ?? meta.shortName ?? ticker,
    price,
    priceFormatted:          `$${price.toFixed(2)}`,
    change,
    changeFormatted:         `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)}`,
    changePercent:           changePct,
    changePercentFormatted:  `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
    exchange:                exc,
    tradingViewSymbol:       exc ? `${exc}:${ticker}` : ticker,
    marketCap:               meta.marketCap ? fmtCap(meta.marketCap) : undefined,
    currency:                meta.currency ?? 'USD',
  };
}

async function fetchBeta(ticker: string): Promise<number> {
  if (!GEMINI_API_KEY) return 1.0;
  try {
    const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `Return the 5-year monthly beta of ${ticker.toUpperCase()} vs the S&P 500. Account for special cases: inverse ETFs have negative beta (SQQQ ≈ -3), leveraged ETFs amplify (TQQQ ≈ 3), gold/bonds have near-zero beta. Return ONLY valid JSON: {"beta": <decimal number>}` }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 50 },
      }),
    });
    if (!res.ok) return 1.0;
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    const data = JSON.parse(text ?? '{}');
    const beta = typeof data.beta === 'number' && isFinite(data.beta) ? data.beta : 1.0;
    return beta;
  } catch {
    return 1.0;
  }
}

async function fetchSector(ticker: string): Promise<string> {
  const fallback = KNOWN_SECTORS[ticker.toUpperCase()] ?? 'Other';
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
    );
    if (!res.ok) return fallback;
    const json = await res.json();
    const sectorRaw = json?.quoteSummary?.result?.[0]?.assetProfile?.sector;
    return typeof sectorRaw === 'string' && sectorRaw.trim() ? sectorRaw.trim() : fallback;
  } catch {
    return fallback;
  }
}

async function fetchVolatility(ticker: string): Promise<number> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
    );
    if (!res.ok) return 0.30;
    const json = await res.json();
    const closes: number[] = (
      json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    ).filter((v: unknown): v is number => typeof v === 'number' && isFinite(v));
    if (closes.length < 5) return 0.30;
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) returns.push(Math.log(closes[i] / closes[i - 1]));
    const mean     = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
    return Math.min(Math.sqrt(variance) * Math.sqrt(252), 2.0);
  } catch {
    return 0.30;
  }
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase();
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  try {
    const [quote, beta, sector, volatility] = await Promise.all([
      fetchQuote(ticker),
      fetchBeta(ticker),
      fetchSector(ticker),
      fetchVolatility(ticker),
    ]);
    return NextResponse.json({ quote, beta, sector, volatility });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch portfolio stock data' },
      { status: 500 },
    );
  }
}
