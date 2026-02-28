'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp,
  AlertTriangle, Send, ExternalLink,
} from 'lucide-react';
import {
  type StockAnalysis, type SubScore, type NewsItem, type ContrarianEdge, type ChatMessage,
} from '@/services/gemini';
import { type StockQuote } from '@/services/stockPrice';
import { analyzeStock, fetchContrarianAnalysis, chatWithKratos, fetchStockQuote } from '@/services/clientApi';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';
const PURPLE = '#B388FF';

type Mode = 'SHORT' | 'LONG' | 'IMPACT' | 'ANALYSIS';

// ── Color helpers ─────────────────────────────────────────────────────────────
function gradeColor(g: string) {
  if (['AAA','AA','A'].includes(g)) return GREEN;
  if (['BBB','BB'].includes(g)) return AMBER;
  return RED;
}
function scoreColor(s: number) {
  if (s >= 70) return RED;
  if (s >= 50) return AMBER;
  return GREEN;
}
function scoreColorLong(s: number) {
  if (s >= 70) return GREEN;
  if (s >= 50) return AMBER;
  return RED;
}
function impactColor(i: string) {
  if (i === 'positive') return GREEN;
  if (i === 'negative') return RED;
  return AMBER;
}
function bubbleColor(risk: string) {
  if (risk === 'HIGH') return RED;
  if (risk === 'MODERATE') return AMBER;
  return GREEN;
}

// ── TradingView chart ─────────────────────────────────────────────────────────
function TradingViewChart({ symbol }: { symbol: string }) {
  const html = `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#0D1117;overflow:hidden}#tv{width:100%;height:100%}</style>
    </head><body><div id="tv"></div>
    <script src="https://s3.tradingview.com/tv.js"></script>
    <script>new TradingView.widget({autosize:true,symbol:"${symbol}",interval:"D",timezone:"Etc/UTC",theme:"dark",style:"1",locale:"en",toolbar_bg:"#161B22",enable_publishing:false,hide_side_toolbar:true,allow_symbol_change:false,withdateranges:true,container_id:"tv",backgroundColor:"#0D1117",gridColor:"#30363D30"});</script>
    </body></html>`;

  return (
    <iframe
      srcDoc={html}
      className="w-full"
      style={{ height: 260, border: 'none', backgroundColor: BG }}
      sandbox="allow-scripts allow-same-origin"
      title="TradingView Chart"
    />
  );
}

// ── Score circle ──────────────────────────────────────────────────────────────
function ScoreCircle({ score, grade, verdict, color }: { score: number; grade: string; verdict: string; color: string }) {
  return (
    <div className="flex flex-col items-center py-5 gap-2">
      <div className="flex flex-col items-center justify-center rounded-full" style={{ width: 120, height: 120, border: `3px solid ${color}` }}>
        <span style={{ fontSize: 44, fontWeight: 900, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 13, color: MUTED }}>/100</span>
      </div>
      <span className="px-4 py-1 rounded-lg" style={{ backgroundColor: color + '22', fontSize: 18, fontWeight: 900, color, letterSpacing: 2 }}>{grade}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#E6EDF3', letterSpacing: 0.5 }}>{verdict}</span>
    </div>
  );
}

// ── Expandable sub-score card ─────────────────────────────────────────────────
function SubScoreCard({
  id, score, label, summary, children, expanded, onToggle, colorFn,
}: {
  id: string; score: number; label: string; summary: string;
  children: React.ReactNode; expanded: boolean;
  onToggle: (id: string) => void;
  colorFn: (s: number) => string;
}) {
  const color = colorFn(score);
  return (
    <div className="mb-3 rounded-xl overflow-hidden" style={{ backgroundColor: BG, border: `1px solid ${BORDER}` }}>
      <button
        className="w-full flex items-center gap-3 p-4"
        onClick={() => onToggle(id)}
      >
        <span style={{ fontSize: 28, fontWeight: 900, color, width: 44, textAlign: 'left' }}>{score}</span>
        <div className="flex-1 text-left">
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3' }}>{label}</p>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{summary}</p>
        </div>
        <div className="rounded overflow-hidden" style={{ width: 48, height: 4, backgroundColor: BORDER }}>
          <div style={{ width: `${score}%`, height: 4, backgroundColor: color }} />
        </div>
        {expanded ? <ChevronUp size={16} color={MUTED} /> : <ChevronDown size={16} color={MUTED} />}
      </button>
      {expanded && (
        <div className="p-4 pt-0 border-t flex flex-col gap-3" style={{ borderColor: BORDER }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Bullet group ──────────────────────────────────────────────────────────────
function BulletGroup({ title, items, color = MUTED }: { title: string; items: string[]; color?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 1, marginBottom: 4 }}>{title}</p>
      {items.map((b, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span style={{ color, fontSize: 14, lineHeight: 1.4 }}>•</span>
          <span style={{ flex: 1, fontSize: 13, color: '#E6EDF3', lineHeight: 1.5 }}>{b}</span>
        </div>
      ))}
    </div>
  );
}

// ── News card ─────────────────────────────────────────────────────────────────
function NewsCard({ item }: { item: NewsItem }) {
  const color = impactColor(item.ai_impact);
  const Icon  = item.ai_impact === 'positive' ? ArrowUp : item.ai_impact === 'negative' ? ArrowDown : Minus;
  const label = item.ai_impact === 'positive' ? 'Likely Positive' : item.ai_impact === 'negative' ? 'Likely Negative' : 'Neutral / Limited Impact';
  return (
    <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#E6EDF3', lineHeight: 1.4 }}>{item.headline}</p>
      <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{item.source} · {item.date}</p>
      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginTop: 6 }}>{item.summary}</p>
      <div className="flex items-center gap-2 mt-3">
        <Icon size={13} color={color} />
        <span style={{ fontSize: 12, fontWeight: 700, color }}>AI Impact View: {label}</span>
      </div>
      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6, marginTop: 4, fontStyle: 'italic' }}>{item.ai_impact_text}</p>
    </div>
  );
}

// ── Contrarian Edge card ──────────────────────────────────────────────────────
function ContrarianCard({ data }: { data: ContrarianEdge }) {
  const bColor = bubbleColor(data.bubble_risk);
  return (
    <div className="rounded-2xl p-4 mb-4 flex flex-col gap-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      {/* Verdict + bubble risk */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 4 }}>CONTRARIAN EDGE</p>
          <p style={{ fontSize: 17, fontWeight: 900, color: '#E6EDF3', lineHeight: 1.3 }}>{data.verdict}</p>
        </div>
        <div className="flex flex-col items-center px-3 py-2 rounded-xl" style={{ backgroundColor: bColor + '20' }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: bColor, letterSpacing: 1 }}>BUBBLE RISK</span>
          <span style={{ fontSize: 15, fontWeight: 900, color: bColor, marginTop: 2 }}>{data.bubble_risk}</span>
        </div>
      </div>

      {/* Hype vs Fundamentals */}
      <div className="flex flex-col gap-2">
        {[
          { label: 'Hype / Narrative', score: data.hype_score, color: RED },
          { label: 'Fundamentals',     score: data.fundamentals_score, color: GREEN },
        ].map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span style={{ fontSize: 11, color: MUTED, width: 110, flexShrink: 0 }}>{b.label}</span>
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: BORDER }}>
              <div style={{ width: `${b.score}%`, height: 6, backgroundColor: b.color }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: b.color, width: 28, textAlign: 'right' }}>{b.score}</span>
          </div>
        ))}
      </div>

      {/* Contrarian take */}
      <div className="rounded-xl p-3" style={{ backgroundColor: BG }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: PURPLE, letterSpacing: 1.5, marginBottom: 6 }}>THE CONTRARIAN TAKE</p>
        <p style={{ fontSize: 13, color: '#C9D1D9', lineHeight: 1.6 }}>{data.contrarian_take}</p>
      </div>

      {/* Crowd vs ALETHEIA */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ backgroundColor: BG, border: `1px solid ${RED}40` }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: RED, letterSpacing: 1, marginBottom: 6 }}>CROWD SEES</p>
          {data.crowd_sees.map((s, i) => (
            <div key={i} className="flex gap-2 items-start mb-1">
              <span style={{ color: RED, fontSize: 12 }}>•</span>
              <span style={{ flex: 1, fontSize: 11, color: '#C9D1D9', lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: BG, border: `1px solid ${GREEN}40` }}>
          <p style={{ fontSize: 9, fontWeight: 900, color: GREEN, letterSpacing: 1, marginBottom: 6 }}>ALETHEIA SEES</p>
          {data.aletheia_sees.map((s, i) => (
            <div key={i} className="flex gap-2 items-start mb-1">
              <span style={{ color: GREEN, fontSize: 12 }}>•</span>
              <span style={{ flex: 1, fontSize: 11, color: '#C9D1D9', lineHeight: 1.5 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Referenced articles */}
      {data.referenced_articles?.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 8 }}>REFERENCED ARTICLES</p>
          {data.referenced_articles.map((a, i) => {
            const aColor = a.sentiment === 'bullish' ? GREEN : a.sentiment === 'bearish' ? RED : MUTED;
            return (
              <a
                key={i}
                href={`https://news.google.com/search?q=${encodeURIComponent(a.query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 py-3 hover:opacity-80 transition-all"
                style={{ borderTop: `1px solid ${BORDER}`, textDecoration: 'none' }}
              >
                <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: aColor }} />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, color: '#E6EDF3', lineHeight: 1.4, fontWeight: 600 }}>{a.headline}</p>
                  <p style={{ fontSize: 10, color: aColor, marginTop: 2, fontWeight: 700 }}>{a.source} · {a.sentiment}</p>
                </div>
                <ExternalLink size={12} color={MUTED} />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Chat bubble ───────────────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GREEN + '22' }}>
          <span style={{ fontSize: 12, fontWeight: 900, color: GREEN }}>A</span>
        </div>
      )}
      <div
        className="max-w-xs rounded-2xl px-3 py-2.5"
        style={{
          backgroundColor: isUser ? GREEN : CARD,
          borderBottomLeftRadius: !isUser ? 4 : undefined,
          borderBottomRightRadius: isUser ? 4 : undefined,
          border: !isUser ? `1px solid ${BORDER}` : undefined,
        }}
      >
        <p style={{ fontSize: 14, color: isUser ? BG : '#E6EDF3', lineHeight: 1.5 }}>{msg.text}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StockPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const ticker = (params.ticker as string)?.toUpperCase();
  const rec    = searchParams.get('rec') as 'SHORT' | 'LONG' | 'HOLD' | null;

  const [mode, setMode]         = useState<Mode>('SHORT');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [quote,   setQuote]   = useState<StockQuote | null>(null);
  const [data,    setData]    = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [contrarian,        setContrarian]        = useState<ContrarianEdge | null>(null);
  const [contrarianLoading, setContrarianLoading] = useState(false);
  const [contrarianError,   setContrarianError]   = useState<string | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    setData(null);
    try {
      const q = await fetchStockQuote(ticker).catch(() => null);
      if (q) setQuote(q);
      const hint = rec === 'SHORT' || rec === 'LONG' || rec === 'HOLD' ? rec : undefined;
      const analysis = await analyzeStock(ticker, q?.priceFormatted, hint);
      setData(analysis);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to analyse stock');
    } finally {
      setLoading(false);
    }
  }, [ticker, rec]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode !== 'ANALYSIS' || !data || contrarian || contrarianLoading) return;
    setContrarianLoading(true);
    setContrarianError(null);
    fetchContrarianAnalysis(ticker!, data)
      .then(setContrarian)
      .catch((e: unknown) => setContrarianError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setContrarianLoading(false));
  }, [mode, data, ticker, contrarian, contrarianLoading]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const sendChat = useCallback(async () => {
    const q = chatInput.trim();
    if (!q || !data || chatLoading) return;
    setChatInput('');
    const userMsg: ChatMessage = { role: 'user', text: q };
    setChatHistory((h) => [...h, userMsg]);
    setChatLoading(true);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    try {
      const reply = await chatWithKratos(ticker!, q, data, contrarian, [...chatHistory, userMsg]);
      setChatHistory((h) => [...h, { role: 'ai', text: reply }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: unknown) {
      setChatHistory((h) => [...h, { role: 'ai', text: `Sorry, I hit an error: ${e instanceof Error ? e.message : 'unknown'}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, data, contrarian, chatHistory, chatLoading, ticker]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ backgroundColor: BG, minHeight: '100vh' }}>
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={() => router.back()}><ChevronLeft size={22} color={MUTED} /></button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#E6EDF3', letterSpacing: 1 }}>{ticker}</span>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 p-8" style={{ minHeight: 300 }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
        <p style={{ fontSize: 17, fontWeight: 700, color: MUTED }}>ALETHEIA is analysing {ticker}…</p>
        <p style={{ fontSize: 13, color: MUTED }}>Scanning fundamentals, narrative, positioning</p>
      </div>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !data) return (
    <div style={{ backgroundColor: BG, minHeight: '100vh' }}>
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <button onClick={() => router.back()}><ChevronLeft size={22} color={MUTED} /></button>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#E6EDF3', letterSpacing: 1 }}>{ticker}</span>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 p-8" style={{ minHeight: 300 }}>
        <AlertTriangle size={48} color={AMBER} />
        <p style={{ fontSize: 17, fontWeight: 700, color: AMBER }}>Analysis failed</p>
        <p style={{ fontSize: 13, color: MUTED }}>{error}</p>
        <button
          onClick={load}
          className="px-6 py-2.5 rounded-xl font-bold"
          style={{ backgroundColor: AMBER + '30', color: AMBER, fontSize: 15 }}
        >
          Try Again
        </button>
      </div>
    </div>
  );

  const masterColor = data.master_color ?? (
    data.master_recommendation === 'SHORT' ? RED :
    data.master_recommendation === 'LONG'  ? GREEN : AMBER
  );
  const shortColor = gradeColor(data.short_mode.letter_grade);
  const longColor  = gradeColor(data.long_mode.letter_grade);

  const displayPrice   = quote?.priceFormatted ?? data.price;
  const displayChange  = quote ? `${quote.changePercentFormatted}  Today` : `${data.price_change_1y}  1Y`;
  const changePositive = quote ? quote.changePercent >= 0 : (data.price_change_1y ?? '').startsWith('+');
  const tvSymbol       = quote?.tradingViewSymbol ?? ticker ?? '';
  const displayMarketCap = quote?.marketCap ?? data.market_cap;

  // ── Tab renderers ──────────────────────────────────────────────────────────
  const renderShort = () => {
    const s = data.short_mode;
    return (
      <div className="animate-fade-in">
        <ScoreCircle score={s.total_score} grade={s.letter_grade} verdict={s.verdict} color={shortColor} />
        <SubScoreCard id="ff" score={s.fundamental_fragility.score} label={s.fundamental_fragility.label} summary={s.fundamental_fragility.summary} expanded={expanded.has('ff')} onToggle={toggleExpand} colorFn={scoreColor}>
          <BulletGroup title="Earnings & Revenue" items={s.fundamental_fragility.earnings_revenue_points} color={RED} />
          <BulletGroup title="Balance Sheet Risk"  items={s.fundamental_fragility.balance_sheet_points} color={AMBER} />
          <BulletGroup title="Valuation Excess"    items={s.fundamental_fragility.valuation_points} color={RED} />
        </SubScoreCard>
        <SubScoreCard id="ni" score={s.narrative_inflation.score} label={s.narrative_inflation.label} summary={s.narrative_inflation.summary} expanded={expanded.has('ni')} onToggle={toggleExpand} colorFn={scoreColor}>
          <BulletGroup title="Narrative Intensity" items={s.narrative_inflation.narrative_points} color={RED} />
          <BulletGroup title="Price Action"         items={s.narrative_inflation.price_action_points} color={AMBER} />
          <BulletGroup title="Red Flags"            items={s.narrative_inflation.red_flag_points} color={RED} />
        </SubScoreCard>
        <SubScoreCard id="cr" score={s.catalyst_risk.score} label={s.catalyst_risk.label} summary={s.catalyst_risk.summary} expanded={expanded.has('cr')} onToggle={toggleExpand} colorFn={scoreColor}>
          <BulletGroup title="Upcoming Catalysts" items={s.catalyst_risk.upcoming_catalysts} color={AMBER} />
          <BulletGroup title="Key Points"          items={s.catalyst_risk.points} color={MUTED} />
        </SubScoreCard>
      </div>
    );
  };

  const renderLong = () => {
    const l = data.long_mode;
    const subScores: { id: string; sub: SubScore }[] = [
      { id: 'fs', sub: l.fundamental_strength },
      { id: 'va', sub: l.valuation_attractiveness },
      { id: 'em', sub: l.earnings_momentum },
      { id: 'ps', sub: l.positioning_stability },
      { id: 'ng', sub: l.narrative_gap },
    ];
    return (
      <div className="animate-fade-in">
        <ScoreCircle score={l.total_score} grade={l.letter_grade} verdict={l.verdict} color={longColor} />
        {subScores.map(({ id, sub }) => (
          <SubScoreCard key={id} id={id} score={sub.score} label={sub.label} summary={sub.summary} expanded={expanded.has(id)} onToggle={toggleExpand} colorFn={scoreColorLong}>
            <BulletGroup title="Analysis" items={sub.points} color={longColor} />
          </SubScoreCard>
        ))}
      </div>
    );
  };

  const renderImpact = () => {
    const m = data.market_impact;
    const s = m.sentiment;
    const sentColor  = s.overall === 'positive' ? GREEN : s.overall === 'negative' ? RED : MUTED;
    const trendColor = s.narrative_trend === 'increasing' ? RED : s.narrative_trend === 'declining' ? GREEN : MUTED;
    return (
      <div className="flex flex-col gap-4 animate-fade-in">
        <div className="rounded-2xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 2, marginBottom: 12 }}>COMPANY OVERVIEW</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: 'Sector',     value: data.sector },
              { label: 'Industry',   value: data.industry },
              { label: 'Market Cap', value: displayMarketCap },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center rounded-lg px-3 py-2" style={{ backgroundColor: BG }}>
                <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>{c.label}</span>
                <span style={{ fontSize: 13, color: '#E6EDF3', fontWeight: 700, marginTop: 2 }}>{c.value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>{data.company_overview}</p>
        </div>

        <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 2 }}>LATEST NEWS</p>
        {m.news.map((n, i) => <NewsCard key={i} item={n} />)}

        <div className="rounded-2xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 2, marginBottom: 12 }}>SENTIMENT SNAPSHOT</p>
          <div className="flex gap-2">
            {[
              { label: 'News Sentiment',  value: s.overall,         color: sentColor },
              { label: 'Coverage Volume', value: s.coverage_volume, color: s.coverage_volume === 'elevated' ? RED : s.coverage_volume === 'moderate' ? AMBER : GREEN },
              { label: 'Narrative Trend', value: s.narrative_trend, color: trendColor },
            ].map((chip) => (
              <div key={chip.label} className="flex-1 flex flex-col items-center rounded-xl px-2 py-2.5" style={{ backgroundColor: BG, border: `1px solid ${chip.color}40` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: chip.color, letterSpacing: 0.5 }}>{chip.value.toUpperCase()}</span>
                <span className="text-center" style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: BG, minHeight: '100vh' }}>
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: `1px solid ${BORDER}`, backgroundColor: BG }}
      >
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5">
          <ChevronLeft size={22} color={MUTED} />
        </button>
        <div className="flex-1">
          <p style={{ fontSize: 22, fontWeight: 900, color: '#E6EDF3', letterSpacing: 1 }}>{data.ticker}</p>
          <p className="truncate" style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{quote?.name ?? data.name}</p>
        </div>
        <span className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: masterColor + '22', fontSize: 12, fontWeight: 800, color: masterColor, letterSpacing: 1 }}>
          {data.master_recommendation}
        </span>
      </div>

      {/* ── Price row ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-baseline gap-3 flex-wrap px-4 py-2.5"
        style={{ backgroundColor: CARD, borderBottom: `1px solid ${BORDER}` }}
      >
        <span style={{ fontSize: 28, fontWeight: 900, color: '#E6EDF3' }}>{displayPrice}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: changePositive ? GREEN : RED }}>{displayChange}</span>
        {quote && <span style={{ fontSize: 12, color: MUTED }}>{quote.exchange} · {displayMarketCap}</span>}
      </div>

      {/* ── Mode tabs ─────────────────────────────────────────────────────── */}
      <div className="flex" style={{ backgroundColor: CARD, borderBottom: `1px solid ${BORDER}` }}>
        {([
          { id: 'SHORT',    label: 'SHORT THESIS',  color: RED    },
          { id: 'LONG',     label: 'LONG THESIS',   color: GREEN  },
          { id: 'IMPACT',   label: 'MARKET IMPACT', color: BLUE   },
          { id: 'ANALYSIS', label: 'ANALYSIS',      color: PURPLE },
        ] as { id: Mode; label: string; color: string }[]).map(({ id, label, color }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex-1 flex items-center justify-center py-3 transition-all"
              style={{
                fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                color: active ? color : MUTED,
                borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {mode === 'ANALYSIS' ? (
        /* Analysis tab: chat interface */
        <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex-1 overflow-y-auto p-4">
            {contrarianLoading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: PURPLE, borderTopColor: 'transparent' }} />
                <p style={{ fontSize: 13, color: MUTED }}>ALETHEIA is gathering sentiment intelligence…</p>
              </div>
            )}
            {contrarianError && (
              <div className="flex flex-col items-center gap-3 py-5">
                <p style={{ color: AMBER, fontSize: 13 }}>{contrarianError}</p>
                <button
                  onClick={() => {
                    setContrarianError(null);
                    setContrarianLoading(true);
                    fetchContrarianAnalysis(ticker!, data)
                      .then(setContrarian)
                      .catch((e: unknown) => setContrarianError(e instanceof Error ? e.message : 'Failed'))
                      .finally(() => setContrarianLoading(false));
                  }}
                  className="px-4 py-2 rounded-xl font-bold"
                  style={{ backgroundColor: AMBER + '30', color: AMBER }}
                >
                  Retry
                </button>
              </div>
            )}
            {contrarian && <ContrarianCard data={contrarian} />}

            {/* Chat divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 2 }}>ASK ALETHEIA</span>
              <div className="flex-1 h-px" style={{ backgroundColor: BORDER }} />
            </div>

            {chatHistory.length === 0 && (
              <p className="text-center mb-4 italic" style={{ fontSize: 12, color: MUTED }}>
                Ask anything — valuation, moat, risks, catalysts…
              </p>
            )}

            {chatHistory.map((msg, i) => <ChatBubble key={i} msg={msg} />)}

            {chatLoading && (
              <div className="flex items-end gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: GREEN + '22' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: GREEN }}>A</span>
                </div>
                <div className="rounded-2xl px-3 py-2.5" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: MUTED }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: MUTED, animationDelay: '0.15s' }} />
                    <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: MUTED, animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: CARD, borderTop: `1px solid ${BORDER}` }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
              placeholder={`Ask about ${ticker}…`}
              className="flex-1 rounded-full px-4 py-2.5 outline-none"
              style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, fontSize: 15, color: '#E6EDF3' }}
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all"
              style={{ opacity: (!chatInput.trim() || chatLoading) ? 0.4 : 1 }}
            >
              <Send size={22} color={GREEN} />
            </button>
          </div>
        </div>
      ) : (
        /* Other tabs: chart + content */
        <div className="overflow-y-auto pb-10">
          {/* TradingView chart */}
          <div style={{ borderBottom: `1px solid ${BORDER}` }}>
            <TradingViewChart symbol={tvSymbol} />
          </div>

          <div className="p-4">
            {mode === 'SHORT'  && renderShort()}
            {mode === 'LONG'   && renderLong()}
            {mode === 'IMPACT' && renderImpact()}
          </div>
        </div>
      )}
    </div>
  );
}
