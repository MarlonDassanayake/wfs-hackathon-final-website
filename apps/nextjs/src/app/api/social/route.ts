import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const MODEL    = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function callGeminiJson(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4000 },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 120)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    // ── Fear & Greed ──────────────────────────────────────────────────────────
    if (action === 'feargreed') {
      const res = await fetch(
        'https://api.alternative.me/fng/?limit=365&format=json',
        { headers: { 'User-Agent': 'ALETHEIA/1.0' } },
      );
      if (!res.ok) throw new Error(`Fear & Greed API ${res.status}`);
      const json = await res.json();
      const entries: Array<{ value: string; value_classification: string }> = json.data ?? [];
      if (!entries.length) throw new Error('Fear & Greed: empty response');
      const val = (i: number) => Math.round(Number(entries[Math.min(i, entries.length - 1)].value));
      return NextResponse.json({
        score:         val(0),
        rating:        entries[0].value_classification,
        previousClose: val(1),
        previousWeek:  val(7),
        previousMonth: val(30),
        previousYear:  val(364),
      });
    }

    // ── Reddit ────────────────────────────────────────────────────────────────
    if (action === 'reddit') {
      const parseReddit = async (url: string) => {
        try {
          const r = await fetch(url, { headers: { 'User-Agent': 'ALETHEIA/1.0' } });
          if (!r.ok) return [];
          const json = await r.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (json.data.children as any[])
            .filter((c) => !c.data.stickied)
            .map((c) => ({
              id:          c.data.id,
              title:       c.data.title,
              score:       c.data.score,
              numComments: c.data.num_comments,
              subreddit:   c.data.subreddit,
              url:         `https://www.reddit.com${c.data.permalink}`,
              author:      c.data.author,
            }));
        } catch {
          return [];
        }
      };
      const [wsb, inv] = await Promise.all([
        parseReddit('https://www.reddit.com/r/wallstreetbets/top.json?limit=5&t=day'),
        parseReddit('https://www.reddit.com/r/investing/top.json?limit=5&t=day'),
      ]);
      return NextResponse.json([...wsb, ...inv]);
    }

    // ── Market News (Gemini) ──────────────────────────────────────────────────
    if (action === 'news') {
      const raw = await callGeminiJson(`Generate 8 current major financial market news items from today or this week.

Return a JSON array (no markdown):
[
  {
    "theme": "<1-3 word UPPERCASE theme, e.g. FED RATES, AI SURGE, OIL DROP, EARNINGS BEAT>",
    "headline": "<full news headline>",
    "source": "<e.g. Reuters, Bloomberg, WSJ, FT>",
    "date": "<e.g. Today, Yesterday, Mon Feb 24>",
    "blurb": "<1-2 sentence plain-English summary of what happened and why it matters>",
    "impact": "<positive or negative or neutral>",
    "query": "<3-5 word Google search query to find this article>"
  }
]

Be specific about real events. Cover a mix of: equities, macro, earnings, geopolitics, tech.
Return only the JSON array.`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr: any[] = JSON.parse(raw);
      return NextResponse.json(arr.map((i) => ({
        theme:     i.theme ?? 'MARKETS',
        headline:  i.headline,
        source:    i.source,
        date:      i.date,
        blurb:     i.blurb,
        impact:    i.impact ?? 'neutral',
        searchUrl: `https://news.google.com/search?q=${encodeURIComponent(i.query ?? i.headline)}`,
      })));
    }

    // ── X Pulse (Gemini) ──────────────────────────────────────────────────────
    if (action === 'xpulse') {
      const raw = await callGeminiJson(`Generate 6 short representative financial market opinions that reflect current Twitter/X financial discourse.
Represent a mix of: macro traders, retail bulls, contrarians, value investors.

Return a JSON array (no markdown):
[
  {
    "persona": "<@handle style, e.g. @macro_vol, @wsb_degen, @value_hunter>",
    "take": "<1 punchy sentence opinion about current markets or a specific stock/sector>",
    "sentiment": "<bullish or bearish or neutral>",
    "topic": "<2-3 word topic for Twitter search, e.g. NVDA earnings, Fed rates>"
  }
]

Make them feel authentic — vary the tone. Reference real current market themes.
Return only the JSON array.`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr: any[] = JSON.parse(raw);
      return NextResponse.json(arr.map((i) => ({
        persona:   i.persona,
        take:      i.take,
        sentiment: i.sentiment ?? 'neutral',
        searchUrl: `https://twitter.com/search?q=${encodeURIComponent(i.topic ?? 'markets')}&f=top`,
      })));
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
