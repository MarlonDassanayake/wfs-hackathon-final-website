/**
 * ALETHEIA — Portfolio Service
 * Factor-based risk metrics: beta, volatility, Sharpe, sector concentration.
 */

import { fetchStockBeta } from '@/services/gemini';
import { fetchStockQuote, type StockQuote } from '@/services/stockPrice';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PortfolioHolding {
  ticker: string;
  name: string;
  livePrice: number;
  quantity: number;
  allocation: number; // user-adjustable % (0-100)
  beta: number;
  sector: string;
  volatility: number; // annualised decimal e.g. 0.30
}

export interface PortfolioMetrics {
  beta: number;
  volatility: number;       // annualised decimal
  sharpe: number;
  alpha: number;            // simplified moat premium
  riskContributions: Array<{ ticker: string; contribution: number }>;
  sectorConcentration: Record<string, number>; // sector → weight%
}

export interface PortfolioStockData {
  quote: StockQuote;
  beta: number;
  sector: string;
  volatility: number;
}

// ── In-memory cache (5-min TTL) ───────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCache<T>(key: string): T | null {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { _cache.delete(key); return null; }
  return entry.data as T;
}
function setCache(key: string, data: unknown) {
  _cache.set(key, { data, ts: Date.now() });
}

// ── Known sector map (covers ~200 commonly traded tickers) ────────────────────
// Used as primary lookup; API result overrides if available.
// Yahoo Finance GICS sector names are used verbatim.
const KNOWN_SECTORS: Record<string, string> = {
  // Technology
  AAPL:'Technology', MSFT:'Technology', NVDA:'Technology', AMD:'Technology',
  INTC:'Technology', TSM:'Technology', AVGO:'Technology', QCOM:'Technology',
  ORCL:'Technology', CRM:'Technology', ADBE:'Technology', NOW:'Technology',
  SNOW:'Technology', PLTR:'Technology', DDOG:'Technology', NET:'Technology',
  CRWD:'Technology', PANW:'Technology', ZS:'Technology', OKTA:'Technology',
  MU:'Technology', LRCX:'Technology', KLAC:'Technology', AMAT:'Technology',
  MRVL:'Technology', SMCI:'Technology', DELL:'Technology', HPQ:'Technology',
  IBM:'Technology', INTU:'Technology', FTNT:'Technology', ACN:'Technology',
  SAP:'Technology', ASML:'Technology', TXN:'Technology', ANET:'Technology',
  CDNS:'Technology', SNPS:'Technology', GDDY:'Technology', TWLO:'Technology',
  ZM:'Technology', DOCU:'Technology', BILL:'Technology', HUBS:'Technology',
  SHOP:'Technology', TOST:'Technology', GTLB:'Technology', PATH:'Technology',
  ROBO:'Technology', IRBT:'Technology', UPST:'Technology', AI:'Technology',
  // Richtech Robotics and small robotics
  RR:'Technology', BFLY:'Technology', RCAT:'Technology',

  // Communication Services
  GOOGL:'Communication Services', GOOG:'Communication Services',
  META:'Communication Services', NFLX:'Communication Services',
  DIS:'Communication Services', T:'Communication Services',
  VZ:'Communication Services', TMUS:'Communication Services',
  SNAP:'Communication Services', PINS:'Communication Services',
  RDDT:'Communication Services', SPOT:'Communication Services',
  ROKU:'Communication Services', PARA:'Communication Services',
  WBD:'Communication Services', EA:'Communication Services',
  TTWO:'Communication Services', RBLX:'Communication Services',
  MTCH:'Communication Services',

  // Consumer Discretionary
  AMZN:'Consumer Discretionary', TSLA:'Consumer Discretionary',
  HD:'Consumer Discretionary', MCD:'Consumer Discretionary',
  NKE:'Consumer Discretionary', SBUX:'Consumer Discretionary',
  LOW:'Consumer Discretionary', TGT:'Consumer Discretionary',
  BKNG:'Consumer Discretionary', ABNB:'Consumer Discretionary',
  CMG:'Consumer Discretionary', F:'Consumer Discretionary',
  GM:'Consumer Discretionary', RIVN:'Consumer Discretionary',
  LCID:'Consumer Discretionary', EBAY:'Consumer Discretionary',
  ETSY:'Consumer Discretionary', PTON:'Consumer Discretionary',
  RH:'Consumer Discretionary', W:'Consumer Discretionary',
  DKNG:'Consumer Discretionary', MGM:'Consumer Discretionary',

  // Consumer Staples
  WMT:'Consumer Staples', PG:'Consumer Staples', KO:'Consumer Staples',
  PEP:'Consumer Staples', COST:'Consumer Staples', PM:'Consumer Staples',
  MO:'Consumer Staples', MDLZ:'Consumer Staples', CL:'Consumer Staples',
  GIS:'Consumer Staples', KHC:'Consumer Staples', STZ:'Consumer Staples',
  SYY:'Consumer Staples', KR:'Consumer Staples',

  // Financials
  JPM:'Financial Services', BAC:'Financial Services', WFC:'Financial Services',
  GS:'Financial Services', MS:'Financial Services', C:'Financial Services',
  AXP:'Financial Services', V:'Financial Services', MA:'Financial Services',
  'BRK.B':'Financial Services', 'BRK.A':'Financial Services',
  BLK:'Financial Services', SCHW:'Financial Services', COIN:'Financial Services',
  HOOD:'Financial Services', SQ:'Financial Services', PYPL:'Financial Services',
  USB:'Financial Services', PNC:'Financial Services', TFC:'Financial Services',
  ALLY:'Financial Services', SOFI:'Financial Services', NU:'Financial Services',
  ICE:'Financial Services', CME:'Financial Services', SPGI:'Financial Services',
  MCO:'Financial Services', MSCI:'Financial Services',

  // Healthcare
  JNJ:'Healthcare', UNH:'Healthcare', PFE:'Healthcare',
  ABBV:'Healthcare', MRK:'Healthcare', LLY:'Healthcare',
  TMO:'Healthcare', ABT:'Healthcare', DHR:'Healthcare',
  AMGN:'Healthcare', GILD:'Healthcare', BIIB:'Healthcare',
  MRNA:'Healthcare', BNTX:'Healthcare', REGN:'Healthcare',
  VRTX:'Healthcare', ISRG:'Healthcare', CVS:'Healthcare',
  HUM:'Healthcare', CI:'Healthcare', ELV:'Healthcare',
  ZBH:'Healthcare', BSX:'Healthcare', MDT:'Healthcare',
  DXCM:'Healthcare', PODD:'Healthcare', ILMN:'Healthcare',

  // Energy
  XOM:'Energy', CVX:'Energy', COP:'Energy', SLB:'Energy',
  EOG:'Energy', OXY:'Energy', BP:'Energy', SHEL:'Energy',
  PSX:'Energy', VLO:'Energy', MPC:'Energy', HAL:'Energy',
  DVN:'Energy', FANG:'Energy', APA:'Energy',

  // Industrials
  BA:'Industrials', CAT:'Industrials', HON:'Industrials',
  UPS:'Industrials', FDX:'Industrials', LMT:'Industrials',
  RTX:'Industrials', NOC:'Industrials', GD:'Industrials',
  DE:'Industrials', MMM:'Industrials', GE:'Industrials',
  ITW:'Industrials', EMR:'Industrials', ETN:'Industrials',
  CSX:'Industrials', NSC:'Industrials', UNP:'Industrials',
  DAL:'Industrials', UAL:'Industrials', AAL:'Industrials',
  UBER:'Industrials', LYFT:'Industrials',

  // Real Estate
  AMT:'Real Estate', PLD:'Real Estate', EQIX:'Real Estate',
  SPG:'Real Estate', O:'Real Estate', VICI:'Real Estate',
  WY:'Real Estate', CBRE:'Real Estate', WELL:'Real Estate',

  // Utilities
  NEE:'Utilities', DUK:'Utilities', SO:'Utilities',
  AEP:'Utilities', EXC:'Utilities', D:'Utilities',
  PCG:'Utilities', SRE:'Utilities', ED:'Utilities',

  // Materials
  LIN:'Basic Materials', APD:'Basic Materials', ECL:'Basic Materials',
  NEM:'Basic Materials', FCX:'Basic Materials', NUE:'Basic Materials',
  AA:'Basic Materials', ALB:'Basic Materials', MP:'Basic Materials',

  // ETFs / Fixed Income / Commodities
  SPY:'ETF', QQQ:'ETF', IWM:'ETF', DIA:'ETF',
  VTI:'ETF', VOO:'ETF', VGT:'ETF', XLK:'ETF',
  XLF:'ETF', XLE:'ETF', XLV:'ETF', XLI:'ETF',
  ARKK:'ETF', SQQQ:'ETF', TQQQ:'ETF',
  GLD:'Commodities', SLV:'Commodities', USO:'Commodities',
  TLT:'Fixed Income', IEF:'Fixed Income', AGG:'Fixed Income',
};

function knownSector(ticker: string): string | null {
  return KNOWN_SECTORS[ticker.toUpperCase()] ?? null;
}

// ── Beta + Sector (Gemini-calculated beta, KNOWN_SECTORS fallback for sector) ─
async function fetchBetaAndSector(ticker: string): Promise<{ beta: number; sector: string }> {
  const fallbackSector = knownSector(ticker) ?? 'Other';

  // Beta: always ask Gemini — it calculates based on training data
  const beta = await fetchStockBeta(ticker);

  // Sector: try Yahoo Finance quoteSummary, fall back to KNOWN_SECTORS
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=assetProfile`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
    );
    if (!res.ok) throw new Error(`quoteSummary ${res.status}`);
    const json = await res.json();
    const sectorRaw = json?.quoteSummary?.result?.[0]?.assetProfile?.sector;
    const sector = (typeof sectorRaw === 'string' && sectorRaw.trim())
      ? sectorRaw.trim()
      : fallbackSector;
    return { beta, sector };
  } catch {
    return { beta, sector: fallbackSector };
  }
}

// ── Historical Volatility (Yahoo Finance v8 chart, 3-month) ───────────────────
async function fetchVolatility(ticker: string): Promise<number> {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=3mo`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
    );
    if (!res.ok) throw new Error(`Volatility fetch failed: ${res.status}`);
    const json = await res.json();
    const closes: number[] = (
      json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
    ).filter((v: unknown): v is number => typeof v === 'number' && isFinite(v));

    if (closes.length < 5) return 0.30; // fallback

    // Daily log returns
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }

    // Std deviation
    const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
    const dailyVol = Math.sqrt(variance);

    // Annualise × √252
    return Math.min(dailyVol * Math.sqrt(252), 2.0); // cap at 200%
  } catch {
    return 0.30; // fallback: 30%
  }
}

// ── Combined stock info fetch ─────────────────────────────────────────────────
export async function fetchPortfolioStockData(ticker: string): Promise<PortfolioStockData> {
  const key = `portfolio_stock_${ticker.toUpperCase()}`;
  const cached = getCache<PortfolioStockData>(key);
  if (cached) return cached;

  const [quote, betaAndSector, volatility] = await Promise.all([
    fetchStockQuote(ticker),
    fetchBetaAndSector(ticker),
    fetchVolatility(ticker),
  ]);

  const result: PortfolioStockData = {
    quote,
    beta: betaAndSector.beta,
    sector: betaAndSector.sector,
    volatility,
  };
  setCache(key, result);
  return result;
}

// ── Portfolio Metrics (pure function) ─────────────────────────────────────────
const RISK_FREE     = 0.045; // 4.5% US 10Y
const MARKET_RETURN = 0.10;  // S&P 500 long-run expected

export function calculatePortfolioMetrics(holdings: PortfolioHolding[]): PortfolioMetrics {
  if (holdings.length === 0) {
    return {
      beta: 0,
      volatility: 0,
      sharpe: 0,
      alpha: 0,
      riskContributions: [],
      sectorConcentration: {},
    };
  }

  // Normalised weights
  const totalAllocation = holdings.reduce((s, h) => s + h.allocation, 0);
  const weights = holdings.map((h) => h.allocation / (totalAllocation || 1));

  // Portfolio Beta = Σ(w_i × β_i)
  const beta = holdings.reduce((s, h, i) => s + weights[i] * h.beta, 0);

  // Portfolio Volatility using pairwise correlation ρ=0.6 between different stocks
  const vol = Math.sqrt(
    holdings.reduce((s, h, i) =>
      s + holdings.reduce((s2, h2, j) =>
        s2 + weights[i] * weights[j] * (i === j ? 1 : 0.6) * h.volatility * h2.volatility,
        0),
      0),
  );

  // Expected return via CAPM
  const expectedReturn = RISK_FREE + beta * (MARKET_RETURN - RISK_FREE);

  // Sharpe Ratio
  const sharpe = vol > 0 ? (expectedReturn - RISK_FREE) / vol : 0;

  // Simplified alpha: low-beta stocks get a slight moat premium
  const alpha = holdings.reduce(
    (s, h, i) => s + weights[i] * (h.beta < 1 ? 0.01 : -0.005),
    0,
  );

  // Per-stock risk contribution (% of total portfolio risk)
  const riskContributions = holdings.map((h, i) => ({
    ticker: h.ticker,
    contribution: beta > 0
      ? (weights[i] * h.beta / beta) * 100
      : (1 / holdings.length) * 100,
  }));

  // Sector concentration
  const sectorMap: Record<string, number> = {};
  holdings.forEach((h, i) => {
    sectorMap[h.sector] = (sectorMap[h.sector] ?? 0) + weights[i] * 100;
  });

  return { beta, volatility: vol, sharpe, alpha, riskContributions, sectorConcentration: sectorMap };
}
