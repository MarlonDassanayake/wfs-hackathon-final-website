/**
 * ALETHEIA — Social & Market Data Service
 * Fetches Fear & Greed index (CNN), Reddit posts (public API),
 * and market news via Gemini.
 */

const GEMINI_KEY  = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';
const GEMINI_URL  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`;

// ── Types ────────────────────────────────────────────────────────────────────
export interface FearGreedData {
  score: number;
  rating: string;
  previousClose: number;
  previousWeek: number;
  previousMonth: number;
  previousYear: number;
}

export interface RedditPost {
  id: string;
  title: string;
  score: number;
  numComments: number;
  subreddit: string;
  url: string;
  author: string;
}

export interface NewsItem {
  theme: string;       // short UPPERCASE theme label e.g. "FED RATES"
  headline: string;
  source: string;
  date: string;
  blurb: string;
  impact: 'positive' | 'negative' | 'neutral';
  searchUrl: string;   // Google News search for article
}

export interface XPulseItem {
  persona: string;     // e.g. "@macro_vol"
  take: string;        // 1-sentence opinion
  sentiment: 'bullish' | 'bearish' | 'neutral';
  searchUrl: string;   // Twitter search link
}

// ── In-memory cache ───────────────────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000;

function gc<T>(k: string): T | null {
  const e = _cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > TTL) { _cache.delete(k); return null; }
  return e.data as T;
}
function sc(k: string, d: unknown) { _cache.set(k, { data: d, ts: Date.now() }); }

// ── Fear & Greed (alternative.me — free, no auth, no CORS blocks) ────────────
export async function fetchFearGreed(): Promise<FearGreedData> {
  const cached = gc<FearGreedData>('fng');
  if (cached) return cached;

  // Fetch last 365 days so we can compute all historical comparisons
  const res = await fetch(
    'https://api.alternative.me/fng/?limit=365&format=json',
    { headers: { 'User-Agent': 'ALETHEIA/1.0' } }
  );
  if (!res.ok) throw new Error(`Fear & Greed API ${res.status}`);

  const json = await res.json();
  const entries: Array<{ value: string; value_classification: string }> = json.data ?? [];
  if (!entries.length) throw new Error('Fear & Greed: empty response');

  const val = (i: number) => Math.round(Number(entries[Math.min(i, entries.length - 1)].value));

  const data: FearGreedData = {
    score:         val(0),
    rating:        entries[0].value_classification,
    previousClose: val(1),
    previousWeek:  val(7),
    previousMonth: val(30),
    previousYear:  val(364),
  };
  sc('fng', data);
  return data;
}

// ── Reddit (public JSON API) ─────────────────────────────────────────────────
async function fetchSub(sub: string, limit = 5): Promise<RedditPost[]> {
  const res = await fetch(
    `https://www.reddit.com/r/${sub}/top.json?limit=${limit}&t=day`,
    { headers: { 'User-Agent': 'ALETHEIA/1.0' } }
  );
  if (!res.ok) throw new Error(`Reddit ${res.status}`);
  const json = await res.json();
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
}

export async function fetchRedditPosts(): Promise<RedditPost[]> {
  const cached = gc<RedditPost[]>('reddit');
  if (cached) return cached;

  const [wsb, inv] = await Promise.all([
    fetchSub('wallstreetbets', 5).catch(() => [] as RedditPost[]),
    fetchSub('investing', 5).catch(() => [] as RedditPost[]),
  ]);
  const data = [...wsb, ...inv];
  sc('reddit', data);
  return data;
}

// ── Market News (Gemini) ──────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4000 },
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 120)}`);
  }
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

export async function fetchMarketNews(): Promise<NewsItem[]> {
  const cached = gc<NewsItem[]>('news');
  if (cached) return cached;

  const raw = await callGemini(`
Generate 8 current major financial market news items from today or this week.

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

  let arr: any[];
  try { arr = JSON.parse(raw); } catch { throw new Error('News response was incomplete. Please retry.'); }
  const data: NewsItem[] = arr.map((i) => ({
    theme:     i.theme ?? 'MARKETS',
    headline:  i.headline,
    source:    i.source,
    date:      i.date,
    blurb:     i.blurb,
    impact:    i.impact ?? 'neutral',
    searchUrl: `https://news.google.com/search?q=${encodeURIComponent(i.query ?? i.headline)}`,
  }));
  sc('news', data);
  return data;
}

// ── X / Twitter Pulse (Gemini-synthesised sentiment takes) ────────────────────
export async function fetchXPulse(): Promise<XPulseItem[]> {
  const cached = gc<XPulseItem[]>('xpulse');
  if (cached) return cached;

  const raw = await callGemini(`
Generate 6 short representative financial market opinions that reflect current Twitter/X financial discourse.
Represent a mix of: macro traders, retail bulls, contrarians, value investors.

Return a JSON array (no markdown):
[
  {
    "persona": "<@handle style, e.g. @macro_vol, @wsb_degen, @value_hunter>",
    "take": "<1 punchy sentence opinion about current markets or a specific stock/sector>",
    "sentiment": "<bullish or bearish or neutral>",
    "topic": "<2-3 word topic for Twitter search, e.g. NVDA earnings, Fed rates, oil prices>"
  }
]

Make them feel authentic — vary the tone from analytical to casual. Reference real current market themes.
Return only the JSON array.`);

  let arr: any[];
  try { arr = JSON.parse(raw); } catch { throw new Error('X Pulse response was incomplete. Please retry.'); }
  const data: XPulseItem[] = arr.map((i) => ({
    persona:    i.persona,
    take:       i.take,
    sentiment:  i.sentiment ?? 'neutral',
    searchUrl:  `https://twitter.com/search?q=${encodeURIComponent(i.topic ?? 'markets')}&f=top`,
  }));
  sc('xpulse', data);
  return data;
}
