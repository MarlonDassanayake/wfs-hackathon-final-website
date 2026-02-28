/**
 * KRATOS — Gemini AI Service
 *
 * ⚠️  The API key lives in .env (EXPO_PUBLIC_GEMINI_API_KEY).
 *     .env is gitignored. Never hard-code the key here.
 *     For production, route through a backend proxy so the key
 *     is never shipped in the client bundle.
 */

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const MODEL   = 'gemini-flash-latest'; // free tier alias — resolves to latest available flash
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ── In-memory cache (5-min TTL) ──────────────────────────────────────────────
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

// ── Investment philosophy injected into every Gemini call ────────────────────
const SYSTEM_INSTRUCTION = `
You are KRATOS — the AI brain of a personal hedge fund. Every analysis you produce is guided by this investment philosophy:

CORE PHILOSOPHY:
1. EXTREME SELECTIVITY — Say "no" to almost everything. The universe of truly exceptional companies is small. Only the highest-conviction ideas deserve attention. Very successful people say "no" to almost everything (Buffett).
2. MOAT-FIRST — Only favour companies with durable competitive advantages. A moat must SCALE and SELF-PERPETUATE. Ephemeral advantages (better service, lower price without scale) don't count.
3. NEW-ECONOMY MOATS — Today's economy is digital/extremistan. In extremistan, small advantages compound without a physical ceiling. Spotify started with a better frontend; Google and Facebook with slightly better products. The tournament effect is uncapped. Key durable moat sources in the digital age: network effects (double-sided), brand power, scale economies, product stickiness (high switching costs). See a moat where others don't = contrarian alpha.
4. NEVER OVERPAY — Downside protection first; upside takes care of itself. A great company at 60× P/E can still destroy capital through multiple contraction. Don't overpay regardless of quality.
5. BUFFETT METHODOLOGY (not Grahamian) — Ask: "What will this be worth in 5–10 years?" Focus on future earnings power and durability. Grahamian net-nets have been arbitraged away by $10 trillion in private equity. The question has changed from "What is it worth today?" to "What will it be worth in the future?"
6. CONTRARIAN EDGE — Markets systematically overprice popular narratives and underprice ignored quality. Find the gap between story and fundamentals. You make money when you are right AND the market is wrong.
7. MACRO CONTEXT — S&P 500 trades at ~22× forward P/E, the widest gap above the historical median since the dotcom bubble (and this with higher interest rates). In every prior 20-year window, 22× P/E was not sustained beyond 2 years. Assume correction risk is elevated. Downside protection always comes first.

SHORT THESIS LENS:
Target stocks where social narrative >> fundamentals. Signals: earnings deteriorating, insiders selling, parabolic price action disconnected from reality, AI/hype pivot without revenue impact, binary catalysts approaching. These are crowded, narrative-driven trades ripe for mean reversion.

LONG THESIS LENS:
Target under-recognised quality. You want: strong business quality + quiet/ignored narrative + reasonable valuation + growing moat + extremistan industry dynamics. Own what the intelligent minority recognises and the crowd ignores.

SCORING GRADES:
AAA (90–100) | AA (80–89) | A (70–79) | BBB (60–69) | BB (50–59) | B (40–49) | CCC (30–39) | CC (20–29) | C (0–19)

LANGUAGE RULES — MANDATORY:
Always use probabilistic language: "may", "could", "likely", "potentially", "suggests". Never say "will" definitively. Never guarantee outcomes. Be specific, data-referenced, and concise. No walls of text. Maximum 4 bullet points per section.
`.trim();

// ── Core fetch wrapper ───────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  if (!API_KEY) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set in .env');

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface SubScore {
  score: number;
  label: string;
  points: string[];
  summary: string;
}

export interface FundamentalFragilityScore extends SubScore {
  earnings_revenue_points: string[];
  balance_sheet_points: string[];
  valuation_points: string[];
}

export interface NarrativeInflationScore extends SubScore {
  narrative_points: string[];
  price_action_points: string[];
  red_flag_points: string[];
}

export interface CatalystRiskScore extends SubScore {
  upcoming_catalysts: string[];
}

export interface NewsItem {
  headline: string;
  source: string;
  date: string;
  summary: string;
  ai_impact: 'positive' | 'negative' | 'neutral';
  ai_impact_text: string;
}

export interface StockAnalysis {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: string;
  price: string;
  price_change_1y: string;
  master_recommendation: 'SHORT' | 'LONG' | 'HOLD';
  master_color: string;
  company_overview: string;
  short_mode: {
    total_score: number;
    letter_grade: string;
    verdict: string;
    fundamental_fragility: FundamentalFragilityScore;
    narrative_inflation: NarrativeInflationScore;
    catalyst_risk: CatalystRiskScore;
  };
  long_mode: {
    total_score: number;
    letter_grade: string;
    verdict: string;
    fundamental_strength: SubScore;
    valuation_attractiveness: SubScore;
    earnings_momentum: SubScore;
    positioning_stability: SubScore;
    narrative_gap: SubScore;
  };
  market_impact: {
    news: NewsItem[];
    sentiment: {
      overall: 'positive' | 'neutral' | 'negative';
      coverage_volume: 'low' | 'moderate' | 'elevated';
      narrative_trend: 'increasing' | 'stable' | 'declining';
    };
  };
  chart_data: {
    price: number[];
    sentiment: number[];
    fundamentals: number[];
  };
}

export interface LandingPick {
  ticker: string;
  name: string;
  sector: string;
  reason: string;
  score: number;
  letter_grade: string;
}

export interface LandingNewsItem {
  headline: string;
  source: string;
  impact: 'positive' | 'negative' | 'neutral';
  impact_text: string;
  tickers_affected: string[];
}

export interface LandingData {
  top_shorts: LandingPick[];
  top_longs: LandingPick[];
  market_news: LandingNewsItem[];
}

// ── Analyse a single stock ───────────────────────────────────────────────────
export async function analyzeStock(ticker: string): Promise<StockAnalysis> {
  const key = `stock_${ticker.toUpperCase()}`;
  const cached = getCache<StockAnalysis>(key);
  if (cached) return cached;

  const prompt = `
Analyse the stock ${ticker.toUpperCase()} through the KRATOS investment philosophy lens.

Return ONLY a raw JSON object — no markdown fences, no extra text, just JSON.

{
  "ticker": "${ticker.toUpperCase()}",
  "name": "<Full company name>",
  "sector": "<Sector>",
  "industry": "<Industry>",
  "market_cap": "<e.g. $350B>",
  "price": "<Approximate current price e.g. $142.50>",
  "price_change_1y": "<e.g. +45% or -12%>",
  "master_recommendation": "<SHORT | LONG | HOLD>",
  "master_color": "<#FF5252 for SHORT | #00E676 for LONG | #FFB74D for HOLD>",
  "company_overview": "<3-4 sentence neutral description: what the company does, core products/services, geographic exposure, key revenue drivers.>",

  "short_mode": {
    "total_score": <integer 0-100, honest average of the 3 sub-scores>,
    "letter_grade": "<AAA|AA|A|BBB|BB|B|CCC|CC|C>",
    "verdict": "<3-5 word verdict>",
    "fundamental_fragility": {
      "score": <integer 0-100>,
      "label": "Fundamental Fragility Index",
      "earnings_revenue_points": ["<bullet>", "<bullet>", "<bullet>"],
      "balance_sheet_points": ["<bullet>", "<bullet>"],
      "valuation_points": ["<bullet>", "<bullet>"],
      "points": ["<top 3 combined key points>"],
      "summary": "<one sentence>"
    },
    "narrative_inflation": {
      "score": <integer 0-100>,
      "label": "Narrative Inflation Score",
      "narrative_points": ["<bullet>", "<bullet>"],
      "price_action_points": ["<bullet>", "<bullet>"],
      "red_flag_points": ["<bullet>", "<bullet>"],
      "points": ["<top 3 combined key points>"],
      "summary": "<one sentence>"
    },
    "catalyst_risk": {
      "score": <integer 0-100>,
      "label": "Upcoming Binary Risk Events",
      "upcoming_catalysts": ["<catalyst>", "<catalyst>", "<catalyst>", "<catalyst>"],
      "points": ["<top 3 key points>"],
      "summary": "<one sentence>"
    }
  },

  "long_mode": {
    "total_score": <integer 0-100, honest average of the 5 sub-scores>,
    "letter_grade": "<AAA|AA|A|BBB|BB|B|CCC|CC|C>",
    "verdict": "<3-5 word verdict>",
    "fundamental_strength": {
      "score": <integer 0-100>,
      "label": "Fundamental Strength Score",
      "points": ["<bullet>", "<bullet>", "<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "valuation_attractiveness": {
      "score": <integer 0-100>,
      "label": "Valuation Attractiveness Score",
      "points": ["<bullet>", "<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "earnings_momentum": {
      "score": <integer 0-100>,
      "label": "Earnings Momentum Score",
      "points": ["<bullet>", "<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "positioning_stability": {
      "score": <integer 0-100>,
      "label": "Positioning Stability Score",
      "points": ["<bullet>", "<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "narrative_gap": {
      "score": <integer 0-100>,
      "label": "Narrative Gap Score",
      "points": ["<bullet>", "<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    }
  },

  "market_impact": {
    "news": [
      {
        "headline": "<recent news headline>",
        "source": "<e.g. Bloomberg, Reuters, WSJ>",
        "date": "<recent date>",
        "summary": "<1-2 sentence summary>",
        "ai_impact": "<positive | negative | neutral>",
        "ai_impact_text": "<one concise probabilistic statement using may/could/likely>"
      },
      { "<repeat for 5-6 news items total>" }
    ],
    "sentiment": {
      "overall": "<positive | neutral | negative>",
      "coverage_volume": "<low | moderate | elevated>",
      "narrative_trend": "<increasing | stable | declining>"
    }
  },

  "chart_data": {
    "price":        [<10 integers 0-100 representing 10-week normalised price trend>],
    "sentiment":    [<10 integers 0-100 representing 10-week normalised sentiment trend>],
    "fundamentals": [<10 integers 0-100 representing 10-week normalised fundamentals trend>]
  }
}

Important: scores must reflect genuine assessment of ${ticker.toUpperCase()} based on actual known fundamentals, valuations, and market conditions. Be specific and data-referenced.
Return ONLY the JSON object.
`.trim();

  const raw = await callGemini(prompt);
  const data = JSON.parse(raw) as StockAnalysis;
  setCache(key, data);
  return data;
}

// ── Landing page: top picks + market news ───────────────────────────────────
export async function getLandingData(): Promise<LandingData> {
  const key = 'landing';
  const cached = getCache<LandingData>(key);
  if (cached) return cached;

  const prompt = `
Based on current market conditions and the KRATOS investment philosophy, identify the most compelling opportunities right now.

Return ONLY a raw JSON object — no markdown fences, no extra text.

{
  "top_shorts": [
    {
      "ticker": "<TICKER>",
      "name": "<Company Name>",
      "sector": "<Sector>",
      "reason": "<One sentence: why short now — reference narrative vs reality gap>",
      "score": <integer 0-100>,
      "letter_grade": "<AAA|AA|A|BBB|BB|B>"
    },
    { "<second pick>" },
    { "<third pick>" }
  ],
  "top_longs": [
    {
      "ticker": "<TICKER>",
      "name": "<Company Name>",
      "sector": "<Sector>",
      "reason": "<One sentence: why long now — reference under-recognised moat or quality>",
      "score": <integer 0-100>,
      "letter_grade": "<AAA|AA|A|BBB|BB|B>"
    },
    { "<second pick>" },
    { "<third pick>" }
  ],
  "market_news": [
    {
      "headline": "<Real recent market news headline>",
      "source": "<Source>",
      "impact": "<positive | negative | neutral>",
      "impact_text": "<One probabilistic sentence using may/could/likely>",
      "tickers_affected": ["<TICK>", "<TICK>"]
    },
    { "<second news>" },
    { "<third news>" }
  ]
}

Provide exactly 3 shorts, 3 longs, 3 news items. Apply the contrarian philosophy: shorts should be narrative-driven crowded trades; longs should be under-recognised quality with moat potential.
Return ONLY the JSON object.
`.trim();

  const raw = await callGemini(prompt);
  const data = JSON.parse(raw) as LandingData;
  setCache(key, data);
  return data;
}
