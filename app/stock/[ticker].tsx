import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  analyzeStock,
  fetchContrarianAnalysis,
  chatWithKratos,
  type StockAnalysis,
  type SubScore,
  type NewsItem,
  type ContrarianEdge,
  type ChatMessage,
} from '@/services/gemini';
import { fetchStockQuote, type StockQuote } from '@/services/stockPrice';

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

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── TradingView HTML ──────────────────────────────────────────────────────────
function getTradingViewHTML(symbol: string): string {
  return `<!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:#0D1117;overflow:hidden}#tv{width:100%;height:100%}</style>
    </head><body><div id="tv"></div>
    <script src="https://s3.tradingview.com/tv.js"></script>
    <script>new TradingView.widget({autosize:true,symbol:"${symbol}",interval:"D",timezone:"Etc/UTC",theme:"dark",style:"1",locale:"en",toolbar_bg:"#161B22",enable_publishing:false,hide_side_toolbar:true,allow_symbol_change:false,withdateranges:true,container_id:"tv",backgroundColor:"#0D1117",gridColor:"#30363D30"});</script>
    </body></html>`;
}

// ── Score circle ──────────────────────────────────────────────────────────────
const ScoreCircle = ({ score, grade, verdict, color }: {
  score: number; grade: string; verdict: string; color: string;
}) => (
  <View style={sc.wrap}>
    <View style={[sc.ring, { borderColor: color }]}>
      <Text style={[sc.num, { color }]}>{score}</Text>
      <Text style={sc.denom}>/100</Text>
    </View>
    <View style={[sc.gradeBadge, { backgroundColor: color + '22' }]}>
      <Text style={[sc.grade, { color }]}>{grade}</Text>
    </View>
    <Text style={[sc.verdict]}>{verdict}</Text>
  </View>
);
const sc = StyleSheet.create({
  wrap:       { alignItems: 'center', paddingVertical: 20, gap: 8 },
  ring:       { width: 120, height: 120, borderRadius: 60, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  num:        { fontSize: 44, fontWeight: '900', lineHeight: 48 },
  denom:      { fontSize: 13, color: MUTED },
  gradeBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 },
  grade:      { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  verdict:    { fontSize: 14, fontWeight: '700', color: '#E6EDF3', letterSpacing: 0.5 },
});

// ── Expandable sub-score card ─────────────────────────────────────────────────
const SubScoreCard = ({
  id, score, label, summary, children, expanded, onToggle, colorFn,
}: {
  id: string; score: number; label: string; summary: string;
  children: React.ReactNode; expanded: boolean;
  onToggle: (id: string) => void;
  colorFn: (s: number) => string;
}) => {
  const color = colorFn(score);
  return (
    <View style={ssc.card}>
      <Pressable style={ssc.header} onPress={() => onToggle(id)}>
        <View style={ssc.headerLeft}>
          <Text style={[ssc.scoreNum, { color }]}>{score}</Text>
          <View style={ssc.labelWrap}>
            <Text style={ssc.label}>{label}</Text>
            <Text style={ssc.summary}>{summary}</Text>
          </View>
        </View>
        <View style={[ssc.bar, { backgroundColor: BORDER }]}>
          <View style={[ssc.barFill, { width: `${score}%` as any, backgroundColor: color }]} />
        </View>
        <IconSymbol size={16} name={expanded ? 'chevron.up' : 'chevron.down'} color={MUTED} style={{ marginLeft: 8 }} />
      </Pressable>
      {expanded && <View style={ssc.body}>{children}</View>}
    </View>
  );
};
const ssc = StyleSheet.create({
  card:       { backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  header:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  scoreNum:   { fontSize: 28, fontWeight: '900', width: 44 },
  labelWrap:  { flex: 1 },
  label:      { fontSize: 13, fontWeight: '700', color: '#E6EDF3' },
  summary:    { fontSize: 11, color: MUTED, marginTop: 2 },
  bar:        { width: 48, height: 4, borderRadius: 2, overflow: 'hidden' },
  barFill:    { height: 4, borderRadius: 2 },
  body:       { padding: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: BORDER, gap: 10 },
});

// ── Bullet list ───────────────────────────────────────────────────────────────
const BulletGroup = ({ title, items, color = MUTED }: {
  title: string; items: string[]; color?: string;
}) => (
  <View style={styles.bulletGroup}>
    <Text style={[styles.bulletGroupTitle, { color }]}>{title}</Text>
    {items.map((b, i) => (
      <View key={i} style={styles.bulletRow}>
        <Text style={[styles.bulletDot, { color }]}>•</Text>
        <Text style={styles.bulletText}>{b}</Text>
      </View>
    ))}
  </View>
);

// ── News card ─────────────────────────────────────────────────────────────────
const NewsCard = ({ item }: { item: NewsItem }) => {
  const color = impactColor(item.ai_impact);
  const icon  = item.ai_impact === 'positive' ? 'arrow.up.circle.fill'
               : item.ai_impact === 'negative' ? 'arrow.down.circle.fill'
               : 'minus.circle.fill';
  const label = item.ai_impact === 'positive' ? 'Likely Positive'
               : item.ai_impact === 'negative' ? 'Likely Negative'
               : 'Neutral / Limited Impact';
  return (
    <View style={styles.newsCard}>
      <Text style={styles.newsHeadline}>{item.headline}</Text>
      <Text style={[styles.newsMeta, { color: MUTED }]}>{item.source}  ·  {item.date}</Text>
      <Text style={[styles.newsSummary, { color: MUTED }]}>{item.summary}</Text>
      <View style={styles.newsImpactRow}>
        <IconSymbol size={13} name={icon} color={color} />
        <Text style={[styles.newsImpactLabel, { color }]}>AI Impact View: {label}</Text>
      </View>
      <Text style={[styles.newsImpactText, { color: MUTED }]}>{item.ai_impact_text}</Text>
    </View>
  );
};

// ── Contrarian Edge card ──────────────────────────────────────────────────────
const ContrarianCard = ({ data }: { data: ContrarianEdge }) => {
  const bColor = bubbleColor(data.bubble_risk);
  return (
    <View style={ce.container}>
      {/* Verdict + bubble risk */}
      <View style={ce.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={ce.sectionLabel}>CONTRARIAN EDGE</Text>
          <Text style={ce.verdict}>{data.verdict}</Text>
        </View>
        <View style={[ce.riskBadge, { backgroundColor: bColor + '20' }]}>
          <Text style={[ce.riskLabel, { color: bColor }]}>BUBBLE RISK</Text>
          <Text style={[ce.riskValue, { color: bColor }]}>{data.bubble_risk}</Text>
        </View>
      </View>

      {/* Hype vs Fundamentals bars */}
      <View style={ce.barsSection}>
        <ScoreBar label="Hype / Narrative" score={data.hype_score} color={RED} />
        <ScoreBar label="Fundamentals"     score={data.fundamentals_score} color={GREEN} />
      </View>

      {/* Contrarian take */}
      <View style={ce.takeBox}>
        <Text style={ce.takeLabel}>THE CONTRARIAN TAKE</Text>
        <Text style={ce.takeText}>{data.contrarian_take}</Text>
      </View>

      {/* Two-column: crowd vs aletheia */}
      <View style={ce.twoCol}>
        <View style={[ce.col, { borderColor: RED + '40' }]}>
          <Text style={[ce.colTitle, { color: RED }]}>CROWD SEES</Text>
          {data.crowd_sees.map((s, i) => (
            <View key={i} style={ce.colRow}>
              <Text style={[ce.colDot, { color: RED }]}>•</Text>
              <Text style={ce.colText}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={[ce.col, { borderColor: GREEN + '40' }]}>
          <Text style={[ce.colTitle, { color: GREEN }]}>ALETHEIA SEES</Text>
          {data.aletheia_sees.map((s, i) => (
            <View key={i} style={ce.colRow}>
              <Text style={[ce.colDot, { color: GREEN }]}>•</Text>
              <Text style={ce.colText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Referenced articles */}
      {data.referenced_articles?.length > 0 && (
        <View style={ce.articlesSection}>
          <Text style={ce.articlesSectionLabel}>REFERENCED ARTICLES</Text>
          {data.referenced_articles.map((a, i) => {
            const aColor = a.sentiment === 'bullish' ? GREEN : a.sentiment === 'bearish' ? RED : MUTED;
            return (
              <Pressable
                key={i}
                onPress={() => Linking.openURL(`https://news.google.com/search?q=${encodeURIComponent(a.query)}`)}
                style={ce.article}
              >
                <View style={[ce.articleDot, { backgroundColor: aColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={ce.articleHeadline} numberOfLines={2}>{a.headline}</Text>
                  <Text style={[ce.articleSource, { color: aColor }]}>{a.source} · {a.sentiment}</Text>
                </View>
                <IconSymbol size={12} name="arrow.up.right" color={MUTED} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
};

const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
  <View style={ce.barRow}>
    <Text style={ce.barLabel}>{label}</Text>
    <View style={ce.barTrack}>
      <View style={[ce.barFill, { width: `${score}%` as any, backgroundColor: color }]} />
    </View>
    <Text style={[ce.barScore, { color }]}>{score}</Text>
  </View>
);

const ce = StyleSheet.create({
  container:    { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 16, gap: 16 },
  topRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1.5, marginBottom: 4 },
  verdict:      { fontSize: 17, fontWeight: '900', color: '#E6EDF3', lineHeight: 22 },
  riskBadge:    { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  riskLabel:    { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  riskValue:    { fontSize: 15, fontWeight: '900', marginTop: 2 },
  barsSection:  { gap: 10 },
  barRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel:     { fontSize: 11, color: MUTED, width: 110 },
  barTrack:     { flex: 1, height: 6, borderRadius: 3, backgroundColor: BORDER, overflow: 'hidden' },
  barFill:      { height: 6, borderRadius: 3 },
  barScore:     { fontSize: 13, fontWeight: '800', width: 28, textAlign: 'right' },
  takeBox:      { backgroundColor: BG, borderRadius: 10, padding: 12, gap: 6 },
  takeLabel:    { fontSize: 10, fontWeight: '800', color: PURPLE, letterSpacing: 1.5 },
  takeText:     { fontSize: 13, color: '#C9D1D9', lineHeight: 20 },
  twoCol:       { flexDirection: 'row', gap: 10 },
  col:          { flex: 1, backgroundColor: BG, borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  colTitle:     { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  colRow:       { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  colDot:       { fontSize: 12, lineHeight: 18 },
  colText:      { flex: 1, fontSize: 11, color: '#C9D1D9', lineHeight: 17 },
  articlesSection: { gap: 8 },
  articlesSectionLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1.5 },
  article:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: BORDER },
  articleDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  articleHeadline: { fontSize: 12, color: '#E6EDF3', lineHeight: 17, fontWeight: '600' },
  articleSource:   { fontSize: 10, marginTop: 2, fontWeight: '700' },
});

// ── Chat bubble ───────────────────────────────────────────────────────────────
const ChatBubble = ({ msg }: { msg: ChatMessage }) => {
  const isUser = msg.role === 'user';
  return (
    <View style={[chat.row, isUser && { justifyContent: 'flex-end' }]}>
      {!isUser && (
        <View style={chat.aiAvatar}>
          <Text style={chat.aiAvatarText}>A</Text>
        </View>
      )}
      <View style={[chat.bubble, isUser ? chat.userBubble : chat.aiBubble]}>
        <Text style={[chat.bubbleText, isUser && { color: BG }]}>{msg.text}</Text>
      </View>
    </View>
  );
};

const chat = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  aiAvatar:   { width: 28, height: 28, borderRadius: 14, backgroundColor: GREEN + '22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aiAvatarText: { fontSize: 12, fontWeight: '900', color: GREEN },
  bubble:     { maxWidth: '78%', borderRadius: 16, padding: 12 },
  aiBubble:   { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: GREEN, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#E6EDF3', lineHeight: 20 },
});

// ── Helper components ─────────────────────────────────────────────────────────
const OverviewChip = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.overviewChip}>
    <Text style={styles.overviewChipLabel}>{label}</Text>
    <Text style={styles.overviewChipValue}>{value}</Text>
  </View>
);

const SentimentChip = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={[styles.sentimentChip, { borderColor: color + '40' }]}>
    <Text style={[styles.sentimentValue, { color }]}>{value.toUpperCase()}</Text>
    <Text style={styles.sentimentLabel}>{label}</Text>
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StockScreen() {
  const { ticker, rec } = useLocalSearchParams<{ ticker: string; rec?: string }>();
  const [mode, setMode]       = useState<Mode>('SHORT');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Stock data
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [data,  setData]  = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Contrarian analysis
  const [contrarian,        setContrarian]        = useState<ContrarianEdge | null>(null);
  const [contrarianLoading, setContrarianLoading] = useState(false);
  const [contrarianError,   setContrarianError]   = useState<string | null>(null);

  // Chat
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    setQuote(null);
    setData(null);
    try {
      const q = await fetchStockQuote(ticker).catch(() => null);
      if (q) setQuote(q);
      const hint = rec === 'SHORT' || rec === 'LONG' || rec === 'HOLD'
        ? rec as 'SHORT' | 'LONG' | 'HOLD' : undefined;
      const analysis = await analyzeStock(ticker, q?.priceFormatted, hint);
      setData(analysis);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [ticker, rec]);

  useEffect(() => { load(); }, [load]);

  // Load contrarian analysis when Analysis tab is selected
  useEffect(() => {
    if (mode !== 'ANALYSIS' || !data || contrarian || contrarianLoading) return;
    setContrarianLoading(true);
    setContrarianError(null);
    fetchContrarianAnalysis(ticker!, data)
      .then(setContrarian)
      .catch((e: any) => setContrarianError(e.message))
      .finally(() => setContrarianLoading(false));
  }, [mode, data]);

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
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const reply = await chatWithKratos(ticker!, q, data, contrarian, [...chatHistory, userMsg]);
      const aiMsg: ChatMessage = { role: 'ai', text: reply };
      setChatHistory((h) => [...h, aiMsg]);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      setChatHistory((h) => [...h, { role: 'ai', text: `Sorry, I hit an error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, data, contrarian, chatHistory, chatLoading, ticker]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.loadingHeader}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <IconSymbol size={22} name="chevron.left" color={MUTED} />
        </Pressable>
        <Text style={styles.loadingTicker}>{ticker}</Text>
      </View>
      <View style={styles.loadingBody}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={[styles.loadingText, { color: MUTED }]}>ALETHEIA is analysing {ticker}…</Text>
        <Text style={[styles.loadingSub,  { color: MUTED }]}>Scanning fundamentals, narrative, positioning</Text>
      </View>
    </SafeAreaView>
  );

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !data) return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.loadingHeader}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <IconSymbol size={22} name="chevron.left" color={MUTED} />
        </Pressable>
        <Text style={styles.loadingTicker}>{ticker}</Text>
      </View>
      <View style={styles.loadingBody}>
        <IconSymbol size={48} name="exclamationmark.triangle.fill" color={AMBER} />
        <Text style={[styles.loadingText, { color: AMBER }]}>Analysis failed</Text>
        <Text style={[styles.loadingSub, { color: MUTED }]}>{error}</Text>
        <Pressable onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
  // Use Yahoo Finance marketCap (reliable), fall back to Gemini estimate
  const displayMarketCap = quote?.marketCap ?? data.market_cap;

  // ── Tab content renderers ──────────────────────────────────────────────────
  const renderShort = () => {
    const s = data.short_mode;
    return (
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 0 }}>
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
      </Animated.View>
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
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 0 }}>
        <ScoreCircle score={l.total_score} grade={l.letter_grade} verdict={l.verdict} color={longColor} />
        {subScores.map(({ id, sub }) => (
          <SubScoreCard key={id} id={id} score={sub.score} label={sub.label} summary={sub.summary} expanded={expanded.has(id)} onToggle={toggleExpand} colorFn={scoreColorLong}>
            <BulletGroup title="Analysis" items={sub.points} color={longColor} />
          </SubScoreCard>
        ))}
      </Animated.View>
    );
  };

  const renderImpact = () => {
    const m = data.market_impact;
    const s = m.sentiment;
    const sentColor  = s.overall === 'positive' ? GREEN : s.overall === 'negative' ? RED : MUTED;
    const trendColor = s.narrative_trend === 'increasing' ? RED : s.narrative_trend === 'declining' ? GREEN : MUTED;
    return (
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>COMPANY OVERVIEW</Text>
          <View style={styles.overviewRow}>
            <OverviewChip label="Sector"     value={data.sector}     />
            <OverviewChip label="Industry"   value={data.industry}   />
            <OverviewChip label="Market Cap" value={displayMarketCap} />
          </View>
          <Text style={styles.overviewText}>{data.company_overview}</Text>
        </View>
        <Text style={[styles.cardTitle, { marginBottom: 4 }]}>LATEST NEWS</Text>
        {m.news.map((n, i) => <NewsCard key={i} item={n} />)}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SENTIMENT SNAPSHOT</Text>
          <View style={styles.sentimentRow}>
            <SentimentChip label="News Sentiment"  value={s.overall}         color={sentColor} />
            <SentimentChip label="Coverage Volume" value={s.coverage_volume} color={s.coverage_volume === 'elevated' ? RED : s.coverage_volume === 'moderate' ? AMBER : GREEN} />
            <SentimentChip label="Narrative Trend" value={s.narrative_trend} color={trendColor} />
          </View>
        </View>
      </Animated.View>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Fixed header ───────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <IconSymbol size={22} name="chevron.left" color={MUTED} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTicker}>{data.ticker}</Text>
          <Text style={styles.headerName} numberOfLines={1}>{quote?.name ?? data.name}</Text>
        </View>
        <View style={[styles.masterBadge, { backgroundColor: masterColor + '22' }]}>
          <Text style={[styles.masterText, { color: masterColor }]}>{data.master_recommendation}</Text>
        </View>
      </View>

      {/* ── Fixed price row ────────────────────────────────────────────────── */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{displayPrice}</Text>
        <Text style={[styles.change, { color: changePositive ? GREEN : RED }]}>{displayChange}</Text>
        {quote && <Text style={[styles.priceMeta, { color: MUTED }]}>{quote.exchange}  ·  {displayMarketCap}</Text>}
      </View>

      {/* ── Fixed mode tabs ────────────────────────────────────────────────── */}
      <View style={styles.tabs}>
        {([
          { id: 'SHORT',    label: 'SHORT THESIS',  color: RED    },
          { id: 'LONG',     label: 'LONG THESIS',   color: GREEN  },
          { id: 'IMPACT',   label: 'MARKET IMPACT', color: BLUE   },
          { id: 'ANALYSIS', label: 'ANALYSIS',      color: PURPLE },
        ] as { id: Mode; label: string; color: string }[]).map(({ id, label, color }) => {
          const active = mode === id;
          return (
            <Pressable key={id} onPress={() => setMode(id)}
              style={[styles.tab, active && { borderBottomColor: color, borderBottomWidth: 2 }]}>
              <Text style={[styles.tabText, { color: active ? color : MUTED }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Analysis tab (keyboard-aware, own scroll) ──────────────────────── */}
      {mode === 'ANALYSIS' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={chatScrollRef}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.analysisContent}
          >
            {/* Contrarian edge section */}
            {contrarianLoading && (
              <View style={styles.contrarianLoading}>
                <ActivityIndicator color={PURPLE} />
                <Text style={[styles.loadingSub, { color: MUTED }]}>
                  ALETHEIA is gathering sentiment intelligence…
                </Text>
              </View>
            )}
            {contrarianError && (
              <View style={styles.contrarianError}>
                <Text style={{ color: AMBER, fontSize: 13 }}>{contrarianError}</Text>
                <Pressable onPress={() => {
                  setContrarianError(null);
                  setContrarianLoading(true);
                  fetchContrarianAnalysis(ticker!, data)
                    .then(setContrarian)
                    .catch((e: any) => setContrarianError(e.message))
                    .finally(() => setContrarianLoading(false));
                }} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}
            {contrarian && <ContrarianCard data={contrarian} />}

            {/* Chat section */}
            <View style={styles.chatDivider}>
              <View style={styles.chatDividerLine} />
              <Text style={styles.chatDividerText}>ASK ALETHEIA</Text>
              <View style={styles.chatDividerLine} />
            </View>

            {chatHistory.length === 0 && (
              <Text style={styles.chatHint}>
                Ask anything — valuation, moat, risks, catalysts…
              </Text>
            )}

            {chatHistory.map((msg, i) => <ChatBubble key={i} msg={msg} />)}

            {chatLoading && (
              <View style={[chat.row, { paddingHorizontal: 16 }]}>
                <View style={chat.aiAvatar}><Text style={chat.aiAvatarText}>K</Text></View>
                <View style={[chat.bubble, chat.aiBubble]}>
                  <ActivityIndicator size="small" color={GREEN} />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Chat input bar */}
          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder={`Ask about ${ticker}…`}
              placeholderTextColor={MUTED}
              returnKeyType="send"
              onSubmitEditing={sendChat}
              multiline={false}
            />
            <Pressable
              onPress={sendChat}
              disabled={!chatInput.trim() || chatLoading}
              style={[styles.sendBtn, (!chatInput.trim() || chatLoading) && { opacity: 0.4 }]}
            >
              <IconSymbol size={22} name="arrow.up.circle.fill" color={GREEN} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── Other tabs: chart scrolls with content ─────────────────────────── */}
      {mode !== 'ANALYSIS' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* TradingView chart — now inside ScrollView so it scrolls with content */}
          <View style={styles.chartContainer}>
            <WebView
              source={{ html: getTradingViewHTML(tvSymbol) }}
              javaScriptEnabled
              domStorageEnabled
              scrollEnabled={false}
              originWhitelist={['*']}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.chartLoading}>
                  <ActivityIndicator color={GREEN} />
                </View>
              )}
              style={styles.webview}
            />
          </View>

          {mode === 'SHORT'  && renderShort()}
          {mode === 'LONG'   && renderLong()}
          {mode === 'IMPACT' && renderImpact()}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Loading / error
  loadingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  loadingTicker: { fontSize: 20, fontWeight: '900', color: '#E6EDF3', letterSpacing: 1 },
  loadingBody:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText:   { fontSize: 17, fontWeight: '700' },
  loadingSub:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:      { backgroundColor: AMBER + '30', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText:     { color: AMBER, fontWeight: '800', fontSize: 15 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTicker: { fontSize: 22, fontWeight: '900', color: '#E6EDF3', letterSpacing: 1 },
  headerName:   { fontSize: 12, color: MUTED, marginTop: 1 },
  masterBadge:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  masterText:   { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  // Price row
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER },
  price:     { fontSize: 28, fontWeight: '900', color: '#E6EDF3' },
  change:    { fontSize: 14, fontWeight: '700' },
  priceMeta: { fontSize: 12 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: CARD },
  tab:  { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // Main scroll content
  content: { paddingBottom: 40, gap: 4 },

  // TradingView
  chartContainer: { height: 260, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: BORDER, marginBottom: 4 },
  webview:        { flex: 1, backgroundColor: BG },
  chartLoading:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },

  // Content padding (used inside content for short/long/impact)
  card:        { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 16, gap: 12, marginHorizontal: 16 },
  cardTitle:   { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 2 },

  // Bullets
  bulletGroup:      { gap: 4 },
  bulletGroupTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  bulletRow:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletDot:  { fontSize: 14, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13, color: '#E6EDF3', lineHeight: 20 },

  // Overview (market impact)
  overviewRow:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  overviewChip:      { backgroundColor: BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  overviewChipLabel: { fontSize: 10, color: MUTED, fontWeight: '600' },
  overviewChipValue: { fontSize: 13, color: '#E6EDF3', fontWeight: '700', marginTop: 2 },
  overviewText:      { fontSize: 13, color: MUTED, lineHeight: 20 },

  // News
  newsCard:        { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, gap: 5, marginBottom: 10, marginHorizontal: 16 },
  newsHeadline:    { fontSize: 14, fontWeight: '700', color: '#E6EDF3', lineHeight: 20 },
  newsMeta:        { fontSize: 11 },
  newsSummary:     { fontSize: 12, lineHeight: 18 },
  newsImpactRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  newsImpactLabel: { fontSize: 12, fontWeight: '700' },
  newsImpactText:  { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

  // Sentiment
  sentimentRow:  { flexDirection: 'row', gap: 8 },
  sentimentChip: { flex: 1, backgroundColor: BG, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  sentimentValue: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  sentimentLabel: { fontSize: 10, color: MUTED, textAlign: 'center' },

  // Analysis tab
  analysisContent:   { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 20, gap: 0 },
  contrarianLoading: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  contrarianError:   { alignItems: 'center', gap: 10, paddingVertical: 20 },

  // Chat divider
  chatDivider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: 4 },
  chatDividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  chatDividerText: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 2 },
  chatHint:        { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },

  // Chat input
  chatInputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER },
  chatInput:    { flex: 1, fontSize: 15, color: '#E6EDF3', backgroundColor: BG, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: BORDER },
  sendBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
