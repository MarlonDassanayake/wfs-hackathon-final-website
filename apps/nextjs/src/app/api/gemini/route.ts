import { NextRequest, NextResponse } from 'next/server';

const API_KEY  = process.env.GEMINI_API_KEY ?? '';
const MODEL    = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_INSTRUCTION = `
You are ALETHEIA — the AI brain of a personal hedge fund. ALETHEIA means "truth/disclosure" in Greek — your purpose is to reveal the gap between narrative and reality. Every analysis you produce is guided by this investment philosophy:

CORE PHILOSOPHY:
1. EXTREME SELECTIVITY — Say "no" to almost everything. The universe of truly exceptional companies is small. Only the highest-conviction ideas deserve attention.
2. MOAT-FIRST — Only favour companies with durable competitive advantages. A moat must SCALE and SELF-PERPETUATE.
3. NEW-ECONOMY MOATS — Digital/extremistan. Network effects, brand power, scale economies, product stickiness. See a moat where others don't = contrarian alpha.
4. NEVER OVERPAY — Downside protection first. A great company at 60× P/E can still destroy capital.
5. BUFFETT METHODOLOGY — Ask: "What will this be worth in 5–10 years?" Focus on future earnings power and durability.
6. CONTRARIAN EDGE — Markets systematically overprice popular narratives and underprice ignored quality.
7. MACRO CONTEXT — S&P 500 trades at ~22× forward P/E. Correction risk is elevated. Downside protection always comes first.
8. SENTIMENT INTELLIGENCE — Track narrative vs fundamentals divergence. Hype + bad fundamentals = short. Ignored quality = long.

SHORT THESIS LENS: Target stocks where narrative >> fundamentals.
LONG THESIS LENS: Target under-recognised quality with moat + reasonable valuation.

SCORING GRADES: AAA (90–100) | AA (80–89) | A (70–79) | BBB (60–69) | BB (50–59) | B (40–49) | CCC (30–39) | CC (20–29) | C (0–19)

LANGUAGE RULES: Always use probabilistic language: "may", "could", "likely", "potentially", "suggests". Never say "will" definitively. Maximum 4 bullet points per section.
`.trim();

async function callGemini(prompt: string, jsonMode = true): Promise<string> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not configured on the server');

  const res = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: jsonMode
        ? { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 10000 }
        : { temperature: 0.5, maxOutputTokens: 2000 },
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── LANDING DATA ────────────────────────────────────────────────────────
    if (action === 'landing') {
      const prompt = `Based on current market conditions and the ALETHEIA investment philosophy, identify the most compelling opportunities right now.

Return ONLY a raw JSON object — no markdown fences, no extra text.

{
  "top_shorts": [
    { "ticker": "<TICKER>", "name": "<Company Name>", "sector": "<Sector>", "reason": "<One sentence: why short now>", "score": <integer 0-100>, "letter_grade": "<AAA|AA|A|BBB|BB|B>" },
    { "<second pick>" },
    { "<third pick>" }
  ],
  "top_longs": [
    { "ticker": "<TICKER>", "name": "<Company Name>", "sector": "<Sector>", "reason": "<One sentence: why long now>", "score": <integer 0-100>, "letter_grade": "<AAA|AA|A|BBB|BB|B>" },
    { "<second pick>" },
    { "<third pick>" }
  ],
  "market_news": [
    { "headline": "<Real recent market news headline>", "source": "<Source>", "impact": "<positive | negative | neutral>", "impact_text": "<One probabilistic sentence>", "tickers_affected": ["<TICK>"] },
    { "<second news>" },
    { "<third news>" }
  ]
}

Provide exactly 3 shorts, 3 longs, 3 news items. Apply contrarian philosophy.
Return ONLY the JSON object.`;
      const raw = await callGemini(prompt);
      const data = JSON.parse(raw);
      return NextResponse.json(data);
    }

    // ── ANALYZE STOCK ───────────────────────────────────────────────────────
    if (action === 'analyze') {
      const { ticker, realPrice, recommendationHint } = body;
      const priceCtx = realPrice ? `The current live market price is ${realPrice}. Use this exact price in the "price" field.` : 'Use your best estimate for the current price.';
      const recCtx   = recommendationHint ? `IMPORTANT: Set "master_recommendation" to "${recommendationHint}" and ensure analysis is consistent.` : '';

      const prompt = `Analyse the stock ${ticker.toUpperCase()} through the ALETHEIA investment philosophy lens.
${priceCtx}
${recCtx}

Return ONLY a raw JSON object — no markdown fences, just JSON.

{
  "ticker": "${ticker.toUpperCase()}",
  "name": "<Full company name>",
  "sector": "<Sector>",
  "industry": "<Industry>",
  "market_cap": "<e.g. $350B>",
  "price": "${realPrice ?? '<current price>'}",
  "price_change_1y": "<e.g. +45% or -12%>",
  "master_recommendation": "<SHORT | LONG | HOLD>",
  "master_color": "<#FF5252 for SHORT | #00E676 for LONG | #FFB74D for HOLD>",
  "company_overview": "<3-4 sentence neutral description>",
  "short_mode": {
    "total_score": <integer 0-100>,
    "letter_grade": "<AAA|AA|A|BBB|BB|B|CCC|CC|C>",
    "verdict": "<3-5 word verdict>",
    "fundamental_fragility": {
      "score": <integer 0-100>, "label": "Fundamental Fragility Index",
      "earnings_revenue_points": ["<bullet>","<bullet>"],
      "balance_sheet_points": ["<bullet>"],
      "valuation_points": ["<bullet>","<bullet>"],
      "points": ["<top 2 key points>"], "summary": "<one sentence>"
    },
    "narrative_inflation": {
      "score": <integer 0-100>, "label": "Narrative Inflation Score",
      "narrative_points": ["<bullet>","<bullet>"],
      "price_action_points": ["<bullet>"],
      "red_flag_points": ["<bullet>","<bullet>"],
      "points": ["<top 2 key points>"], "summary": "<one sentence>"
    },
    "catalyst_risk": {
      "score": <integer 0-100>, "label": "Upcoming Binary Risk Events",
      "upcoming_catalysts": ["<catalyst>","<catalyst>","<catalyst>"],
      "points": ["<top 2 key points>"], "summary": "<one sentence>"
    }
  },
  "long_mode": {
    "total_score": <integer 0-100>,
    "letter_grade": "<AAA|AA|A|BBB|BB|B|CCC|CC|C>",
    "verdict": "<3-5 word verdict>",
    "fundamental_strength":      { "score": <int 0-100>, "label": "Fundamental Strength Score",      "points": ["<bullet>","<bullet>","<bullet>"], "summary": "<one sentence>" },
    "valuation_attractiveness":  { "score": <int 0-100>, "label": "Valuation Attractiveness Score",  "points": ["<bullet>","<bullet>"],             "summary": "<one sentence>" },
    "earnings_momentum":         { "score": <int 0-100>, "label": "Earnings Momentum Score",         "points": ["<bullet>","<bullet>"],             "summary": "<one sentence>" },
    "positioning_stability":     { "score": <int 0-100>, "label": "Positioning Stability Score",     "points": ["<bullet>","<bullet>"],             "summary": "<one sentence>" },
    "narrative_gap":             { "score": <int 0-100>, "label": "Narrative Gap Score",             "points": ["<bullet>","<bullet>"],             "summary": "<one sentence>" }
  },
  "market_impact": {
    "news": [
      { "headline": "<headline>", "source": "<source>", "date": "<date>", "summary": "<1-2 sentence summary>", "ai_impact": "<positive|negative|neutral>", "ai_impact_text": "<one probabilistic sentence>" },
      { "<repeat for 3 items>" }
    ],
    "sentiment": { "overall": "<positive|neutral|negative>", "coverage_volume": "<low|moderate|elevated>", "narrative_trend": "<increasing|stable|declining>" }
  },
  "chart_data": { "price": [<10 ints 0-100>], "sentiment": [<10 ints 0-100>], "fundamentals": [<10 ints 0-100>] }
}

Return ONLY the JSON object.`;
      const raw = await callGemini(prompt);
      const data = JSON.parse(raw);
      return NextResponse.json(data);
    }

    // ── CONTRARIAN ANALYSIS ─────────────────────────────────────────────────
    if (action === 'contrarian') {
      const { ticker, stockData } = body;
      const prompt = `Perform a CONTRARIAN EDGE analysis on ${ticker.toUpperCase()} (${stockData.name}).

STOCK CONTEXT:
- Recommendation: ${stockData.master_recommendation}
- Short thesis score: ${stockData.short_mode.total_score}/100 (${stockData.short_mode.letter_grade}) — ${stockData.short_mode.verdict}
- Long thesis score: ${stockData.long_mode.total_score}/100 (${stockData.long_mode.letter_grade}) — ${stockData.long_mode.verdict}
- Overview: ${stockData.company_overview}

Return ONLY a raw JSON object:
{
  "hype_score": <0-100>,
  "fundamentals_score": <0-100>,
  "bubble_risk": "<HIGH|MODERATE|LOW>",
  "verdict": "<5-7 words>",
  "contrarian_take": "<2-3 sentences>",
  "crowd_sees": ["<point>","<point>","<point>"],
  "aletheia_sees": ["<point>","<point>","<point>"],
  "referenced_articles": [
    { "headline": "<headline>", "source": "<source>", "sentiment": "<bullish|bearish|neutral>", "query": "<search query>" },
    "<repeat for 4-5 articles>"
  ]
}
Return ONLY the JSON object.`;
      const raw = await callGemini(prompt);
      const data = JSON.parse(raw);
      return NextResponse.json(data);
    }

    // ── CHAT ────────────────────────────────────────────────────────────────
    if (action === 'chat') {
      const { ticker, question, stockData, contrarian, history } = body;
      const sentiment = stockData.market_impact.sentiment;
      const ctx = [
        `Stock: ${ticker} — ${stockData.name} (${stockData.sector})`,
        `Recommendation: ${stockData.master_recommendation}`,
        `Short thesis score: ${stockData.short_mode.total_score}/100 (${stockData.short_mode.letter_grade}) — ${stockData.short_mode.verdict}`,
        `Long thesis score: ${stockData.long_mode.total_score}/100 (${stockData.long_mode.letter_grade}) — ${stockData.long_mode.verdict}`,
        `Sentiment: ${sentiment.overall} | Coverage: ${sentiment.coverage_volume} | Narrative trend: ${sentiment.narrative_trend}`,
        `Overview: ${stockData.company_overview}`,
        contrarian ? `Contrarian verdict: ${contrarian.verdict} | Bubble risk: ${contrarian.bubble_risk} | Hype: ${contrarian.hype_score}/100 | Fundamentals: ${contrarian.fundamentals_score}/100` : '',
        contrarian ? `Contrarian insight: ${contrarian.contrarian_take}` : '',
      ].filter(Boolean).join('\n');
      const hist = history?.length ? '\nPrevious conversation:\n' + history.map((m: { role: string; text: string }) => `${m.role === 'user' ? 'User' : 'ALETHEIA'}: ${m.text}`).join('\n') : '';

      const prompt = `You are ALETHEIA analysing ${ticker} for a user. Use this data:\n${ctx}${hist}\n\nUser: ${question}\n\nRules:\n- Write exactly 3 complete sentences. No more, no less.\n- Every sentence must end with a full stop.\n- Reference specific numbers from the data above.\n- Use probabilistic language (may, could, likely, suggests).\n- No bullet points, no markdown, no headers.\n- Be specific to ${ticker}.`;
      const text = await callGemini(prompt, false);
      return NextResponse.json({ reply: text });
    }

    // ── HEDGE ───────────────────────────────────────────────────────────────
    if (action === 'hedge') {
      const { portfolio, metrics } = body;
      const sectorStr   = Object.entries(metrics.sectorConcentration as Record<string, number>).map(([s, w]) => `${s}: ${w.toFixed(1)}%`).join(', ');
      const holdingsStr = (portfolio as { ticker: string; sector: string; weight: number; beta: number }[]).map((h) => `${h.ticker} (${h.sector}, β=${h.beta.toFixed(2)}, weight=${(h.weight * 100).toFixed(1)}%)`).join('; ');

      const prompt = `Generate hedge recommendations for this portfolio.

HOLDINGS: ${holdingsStr}
METRICS: Beta=${metrics.beta.toFixed(2)}, Volatility=${(metrics.volatility * 100).toFixed(1)}%, Sharpe=${metrics.sharpe.toFixed(2)}, Sectors: ${sectorStr}

Return ONLY a raw JSON object:
{
  "hedgeBeta": <float>,
  "volatilityReduction": <integer 1-50>,
  "hedge1": { "title": "<Sector Diversification>", "instruments": ["<ETF>","<ETF>"], "reason": "<1-2 sentences>" },
  "hedge2": { "title": "<Asset Class Diversification>", "instruments": ["<ETF>","<ETF>"], "reason": "<1-2 sentences>" },
  "hedge3": { "title": "<Tactical Hedge>", "instruments": ["<ETF>","<Options>"], "reason": "<1-2 sentences>" },
  "aletheiaInsight": "<3-4 sentences about risk profile>"
}
Return ONLY the JSON object.`;
      const raw = await callGemini(prompt);
      const data = JSON.parse(raw);
      return NextResponse.json(data);
    }

    // ── STOCK BETA ──────────────────────────────────────────────────────────
    if (action === 'beta') {
      const { ticker } = body;
      const prompt = `Return the 5-year monthly beta of ${ticker.toUpperCase()} vs the S&P 500. Account for special cases: inverse ETFs have negative beta (SQQQ ≈ -3), leveraged ETFs amplify (TQQQ ≈ 3), gold/bonds have near-zero beta. Return ONLY valid JSON: {"beta": <decimal number>}`;
      const raw  = await callGemini(prompt);
      const data = JSON.parse(raw);
      return NextResponse.json({ beta: typeof data.beta === 'number' ? data.beta : 1.0 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
