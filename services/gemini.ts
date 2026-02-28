/**
 * ALETHEIA — Gemini AI Service
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
You are ALETHEIA — the AI brain of a personal hedge fund. ALETHEIA means "truth/disclosure" in Greek — your purpose is to reveal the gap between narrative and reality. Every analysis you produce is guided by this investment philosophy:

CORE PHILOSOPHY:
1. EXTREME SELECTIVITY — Say "no" to almost everything. The universe of truly exceptional companies is small. Only the highest-conviction ideas deserve attention. Very successful people say "no" to almost everything (Buffett).
2. MOAT-FIRST — Only favour companies with durable competitive advantages. A moat must SCALE and SELF-PERPETUATE. Ephemeral advantages (better service, lower price without scale) don't count.
3. NEW-ECONOMY MOATS — Today's economy is digital/extremistan. In extremistan, small advantages compound without a physical ceiling. Spotify started with a better frontend; Google and Facebook with slightly better products. The tournament effect is uncapped. Key durable moat sources in the digital age: network effects (double-sided), brand power, scale economies, product stickiness (high switching costs). See a moat where others don't = contrarian alpha.
4. NEVER OVERPAY — Downside protection first; upside takes care of itself. A great company at 60× P/E can still destroy capital through multiple contraction. Don't overpay regardless of quality.
5. BUFFETT METHODOLOGY (not Grahamian) — Ask: "What will this be worth in 5–10 years?" Focus on future earnings power and durability. Grahamian net-nets have been arbitraged away by $10 trillion in private equity. The question has changed from "What is it worth today?" to "What will it be worth in the future?"
6. CONTRARIAN EDGE — Markets systematically overprice popular narratives and underprice ignored quality. Find the gap between story and fundamentals. You make money when you are right AND the market is wrong.
7. MACRO CONTEXT — S&P 500 trades at ~22× forward P/E, the widest gap above the historical median since the dotcom bubble (and this with higher interest rates). In every prior 20-year window, 22× P/E was not sustained beyond 2 years. Assume correction risk is elevated. Downside protection always comes first.
8. SENTIMENT INTELLIGENCE — Crowd sentiment is ALETHEIA's edge. Track narrative vs fundamentals divergence. Elevated hype with deteriorating fundamentals = short signal. Ignored quality with low sentiment = long signal. Sentiment scores anchor every recommendation.

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
        maxOutputTokens: 7000,
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
export async function analyzeStock(
  ticker: string,
  realPrice?: string,
  recommendationHint?: 'SHORT' | 'LONG' | 'HOLD',
): Promise<StockAnalysis> {
  const key = `stock_${ticker.toUpperCase()}`;
  const cached = getCache<StockAnalysis>(key);
  if (cached) return cached;

  const priceContext = realPrice
    ? `The current live market price is ${realPrice}. Use this exact price in the "price" field.`
    : 'Use your best estimate for the current price.';

  const recContext = recommendationHint
    ? `IMPORTANT: Current market positioning classifies this stock as a ${recommendationHint} candidate. Set "master_recommendation" to "${recommendationHint}" and ensure the overall analysis is consistent with this view unless fundamentals overwhelmingly contradict it.`
    : '';

  const prompt = `
Analyse the stock ${ticker.toUpperCase()} through the ALETHEIA investment philosophy lens.
${priceContext}
${recContext}

Return ONLY a raw JSON object — no markdown fences, no extra text, just JSON.

{
  "ticker": "${ticker.toUpperCase()}",
  "name": "<Full company name>",
  "sector": "<Sector>",
  "industry": "<Industry>",
  "market_cap": "<e.g. $350B>",
  "price": "${realPrice ?? '<current price>'}",
  "price_change_1y": "<e.g. +45% or -12% — use real known 52-week performance>",
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
      "earnings_revenue_points": ["<bullet>", "<bullet>"],
      "balance_sheet_points": ["<bullet>"],
      "valuation_points": ["<bullet>", "<bullet>"],
      "points": ["<top 2 combined key points>"],
      "summary": "<one sentence>"
    },
    "narrative_inflation": {
      "score": <integer 0-100>,
      "label": "Narrative Inflation Score",
      "narrative_points": ["<bullet>", "<bullet>"],
      "price_action_points": ["<bullet>"],
      "red_flag_points": ["<bullet>", "<bullet>"],
      "points": ["<top 2 combined key points>"],
      "summary": "<one sentence>"
    },
    "catalyst_risk": {
      "score": <integer 0-100>,
      "label": "Upcoming Binary Risk Events",
      "upcoming_catalysts": ["<catalyst>", "<catalyst>", "<catalyst>"],
      "points": ["<top 2 key points>"],
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
      "points": ["<bullet>", "<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "valuation_attractiveness": {
      "score": <integer 0-100>,
      "label": "Valuation Attractiveness Score",
      "points": ["<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "earnings_momentum": {
      "score": <integer 0-100>,
      "label": "Earnings Momentum Score",
      "points": ["<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "positioning_stability": {
      "score": <integer 0-100>,
      "label": "Positioning Stability Score",
      "points": ["<bullet>", "<bullet>"],
      "summary": "<one sentence>"
    },
    "narrative_gap": {
      "score": <integer 0-100>,
      "label": "Narrative Gap Score",
      "points": ["<bullet>", "<bullet>"],
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
      { "<repeat for 3 news items total>" }
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
  let data: StockAnalysis;
  try {
    data = JSON.parse(raw) as StockAnalysis;
  } catch {
    // Gemini truncated the JSON — retry with stricter token budget signal
    throw new Error(`Analysis response was incomplete. Please try again.`);
  }
  setCache(key, data);
  return data;
}

// ── Landing page: top picks + market news ───────────────────────────────────
export async function getLandingData(): Promise<LandingData> {
  const key = 'landing';
  const cached = getCache<LandingData>(key);
  if (cached) return cached;

  const prompt = `
Based on current market conditions and the ALETHEIA investment philosophy, identify the most compelling opportunities right now.

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
  let data: LandingData;
  try {
    data = JSON.parse(raw) as LandingData;
  } catch {
    throw new Error('Landing data response was incomplete. Please try again.');
  }
  setCache(key, data);
  return data;
}

// ── Contrarian Edge Analysis ──────────────────────────────────────────────────
export interface ContrarianEdge {
  hype_score: number;           // 0-100 how narrative-driven
  fundamentals_score: number;   // 0-100 actual fundamental quality
  bubble_risk: 'HIGH' | 'MODERATE' | 'LOW';
  verdict: string;              // e.g. "AI Hype Exceeds Fundamentals"
  contrarian_take: string;      // 2-3 sentence core insight
  crowd_sees: string[];         // What bulls/media are saying
  aletheia_sees: string[];      // What the numbers/contrarian view reveals
  referenced_articles: Array<{
    headline: string;
    source: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    query: string;
  }>;
}

export async function fetchContrarianAnalysis(
  ticker: string,
  stockData: StockAnalysis,
): Promise<ContrarianEdge> {
  const cacheKey = `contrarian_${ticker.toUpperCase()}`;
  const cached = getCache<ContrarianEdge>(cacheKey);
  if (cached) return cached;

  const prompt = `
Perform a CONTRARIAN EDGE analysis on ${ticker.toUpperCase()} (${stockData.name}).

STOCK CONTEXT:
- Recommendation: ${stockData.master_recommendation}
- Short thesis score: ${stockData.short_mode.total_score}/100 (${stockData.short_mode.letter_grade}) — ${stockData.short_mode.verdict}
- Long thesis score: ${stockData.long_mode.total_score}/100 (${stockData.long_mode.letter_grade}) — ${stockData.long_mode.verdict}
- Overview: ${stockData.company_overview}

Compare the NARRATIVE (what media/crowd says) vs FUNDAMENTALS (what numbers show). Identify the gap. Reference real recent articles. Be specific and data-driven.

Return ONLY a raw JSON object — no markdown, no fences:
{
  "hype_score": <0-100, how narrative/sentiment driven is the stock right now>,
  "fundamentals_score": <0-100, quality of underlying fundamentals>,
  "bubble_risk": "<HIGH|MODERATE|LOW>",
  "verdict": "<5-7 words e.g. 'AI Hype Far Exceeds Revenue Reality'>",
  "contrarian_take": "<2-3 sentences: the single most important thing the crowd is missing about this stock>",
  "crowd_sees": [
    "<what bulls/media say — e.g. 'AI monetisation will drive exponential growth'>",
    "<another narrative point>",
    "<third narrative point>"
  ],
  "aletheia_sees": [
    "<what fundamentals/contrarian view reveals — e.g. 'Revenue growth decelerating despite AI hype'>",
    "<another reality point>",
    "<third reality point>"
  ],
  "referenced_articles": [
    {
      "headline": "<real, specific article headline that has been published about ${ticker.toUpperCase()}>",
      "source": "<Bloomberg|WSJ|FT|Reuters|CNBC|Seeking Alpha|Barron's>",
      "sentiment": "<bullish|bearish|neutral>",
      "query": "<google search query to find this article>"
    },
    "<repeat for 4-5 articles covering both bull and bear perspectives>"
  ]
}
Return ONLY the JSON object.
`.trim();

  const raw = await callGemini(prompt);
  let data: ContrarianEdge;
  try {
    data = JSON.parse(raw) as ContrarianEdge;
  } catch {
    throw new Error('Contrarian analysis response incomplete. Please retry.');
  }
  setCache(cacheKey, data);
  return data;
}

// ── ALETHEIA Chat (plain text, no JSON mode) ──────────────────────────────────
async function callGeminiText(prompt: string): Promise<string> {
  if (!API_KEY) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set in .env');
  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 2000 },
    }),
  });
  if (!res.ok) {
    const e = await res.text().catch(() => '');
    throw new Error(`Gemini chat ${res.status}: ${e.slice(0, 120)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty chat response');
  return text.trim();
}

export type ChatMessage = { role: 'user' | 'ai'; text: string };

export async function chatWithKratos(
  ticker: string,
  question: string,
  stockData: StockAnalysis,
  contrarian: ContrarianEdge | null,
  history: ChatMessage[],
): Promise<string> {
  const sentiment = stockData.market_impact.sentiment;
  const ctx = [
    `Stock: ${ticker.toUpperCase()} — ${stockData.name} (${stockData.sector})`,
    `Recommendation: ${stockData.master_recommendation}`,
    `Short thesis score: ${stockData.short_mode.total_score}/100 (${stockData.short_mode.letter_grade}) — ${stockData.short_mode.verdict}`,
    `Long thesis score: ${stockData.long_mode.total_score}/100 (${stockData.long_mode.letter_grade}) — ${stockData.long_mode.verdict}`,
    `Sentiment: ${sentiment.overall} | Coverage: ${sentiment.coverage_volume} | Narrative trend: ${sentiment.narrative_trend}`,
    `Overview: ${stockData.company_overview}`,
    contrarian ? `Contrarian verdict: ${contrarian.verdict} | Bubble risk: ${contrarian.bubble_risk} | Hype score: ${contrarian.hype_score}/100 | Fundamentals score: ${contrarian.fundamentals_score}/100` : '',
    contrarian ? `Contrarian insight: ${contrarian.contrarian_take}` : '',
    contrarian ? `Crowd narrative: ${contrarian.crowd_sees.slice(0, 2).join('; ')}` : '',
    contrarian ? `ALETHEIA sees: ${contrarian.aletheia_sees.slice(0, 2).join('; ')}` : '',
  ].filter(Boolean).join('\n');

  const hist = history.length
    ? '\nPrevious conversation:\n' + history.map(m => `${m.role === 'user' ? 'User' : 'ALETHEIA'}: ${m.text}`).join('\n')
    : '';

  const prompt = `You are ALETHEIA analysing ${ticker.toUpperCase()} for a user. Use this data:
${ctx}${hist}

User: ${question}

Rules:
- Write exactly 3 complete sentences. No more, no less.
- Every sentence must end with a full stop. Never cut off mid-sentence.
- Reference specific numbers (scores, prices, percentages) from the data above.
- Apply contrarian thinking: where does narrative diverge from fundamentals?
- Use probabilistic language (may, could, likely, suggests).
- No bullet points, no markdown, no headers.
- Be specific to ${ticker.toUpperCase()}.`;

  return callGeminiText(prompt);
}

// ── Portfolio Hedge Recommendations ──────────────────────────────────────────
export interface HedgeRecommendation {
  hedgeBeta: number;
  volatilityReduction: number;
  hedge1: { title: string; instruments: string[]; reason: string };
  hedge2: { title: string; instruments: string[]; reason: string };
  hedge3: { title: string; instruments: string[]; reason: string };
  aletheiaInsight: string;
}

export async function generateHedgeRecommendations(
  portfolio: { ticker: string; sector: string; weight: number; beta: number }[],
  metrics: { beta: number; volatility: number; sharpe: number; sectorConcentration: Record<string, number> },
): Promise<HedgeRecommendation> {
  const sectorStr = Object.entries(metrics.sectorConcentration)
    .map(([s, w]) => `${s}: ${w.toFixed(1)}%`)
    .join(', ');
  const holdingsStr = portfolio
    .map((h) => `${h.ticker} (${h.sector}, β=${h.beta.toFixed(2)}, weight=${(h.weight * 100).toFixed(1)}%)`)
    .join('; ');

  const prompt = `
You are ALETHEIA — a personal hedge fund AI. Generate hedge recommendations for this portfolio.

PORTFOLIO HOLDINGS: ${holdingsStr}
PORTFOLIO METRICS:
- Portfolio Beta: ${metrics.beta.toFixed(2)}
- Annualised Volatility: ${(metrics.volatility * 100).toFixed(1)}%
- Sharpe Ratio: ${metrics.sharpe.toFixed(2)}
- Sector Concentration: ${sectorStr}

Based on these metrics, recommend 3 hedging strategies:
1. Sector Diversification hedge
2. Asset Class Diversification hedge
3. Tactical Hedge (options/inverse ETFs)

Return ONLY a raw JSON object — no markdown, no fences:
{
  "hedgeBeta": <estimated portfolio beta after implementing all hedges — float>,
  "volatilityReduction": <estimated % volatility reduction from hedges — integer 1-50>,
  "hedge1": {
    "title": "<e.g. 'Sector Diversification'>",
    "instruments": ["<e.g. 'XLF — Financials ETF'>", "<e.g. 'XLE — Energy ETF'>"],
    "reason": "<1-2 sentences: why this hedge reduces this portfolio's specific risk>"
  },
  "hedge2": {
    "title": "<e.g. 'Asset Class Diversification'>",
    "instruments": ["<e.g. 'GLD — Gold ETF'>", "<e.g. 'TLT — 20Y Treasury ETF'>"],
    "reason": "<1-2 sentences: why this hedge reduces this portfolio's specific risk>"
  },
  "hedge3": {
    "title": "<e.g. 'Tactical Hedge'>",
    "instruments": ["<e.g. 'SQQQ — 3x Inverse NASDAQ'>", "<e.g. 'SPY Put Options'>"],
    "reason": "<1-2 sentences: why this hedge reduces this portfolio's specific risk>"
  },
  "aletheiaInsight": "<3-4 sentences: ALETHEIA's assessment of this portfolio's risk profile — reference specific beta, volatility, sector concentration numbers. Apply contrarian/sentiment intelligence lens.>"
}
Return ONLY the JSON object.
`.trim();

  const raw = await callGemini(prompt);
  let data: HedgeRecommendation;
  try {
    data = JSON.parse(raw) as HedgeRecommendation;
  } catch {
    throw new Error('Hedge recommendations response incomplete. Please retry.');
  }
  return data;
}
