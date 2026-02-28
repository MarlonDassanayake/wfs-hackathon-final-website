import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { analyzeStock, type StockAnalysis, type SubScore, type NewsItem } from '@/services/gemini';

const { width } = Dimensions.get('window');
const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';

type Mode = 'SHORT' | 'LONG' | 'IMPACT';

// ── Helpers ───────────────────────────────────────────────────────────────────
function gradeColor(g: string) {
  if (['AAA','AA','A'].includes(g)) return GREEN;
  if (['BBB','BB'].includes(g)) return AMBER;
  return RED;
}
function scoreColor(s: number) {
  if (s >= 70) return RED;    // high short signal or high quality
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
  return MUTED;
}

// ── Mini line chart ───────────────────────────────────────────────────────────
const MiniChart = ({ series, h = 70 }: {
  series: { data: number[]; color: string }[];
  h?: number;
}) => {
  const w = width - 64;
  const n = series[0]?.data.length ?? 0;
  if (n < 2) return null;
  const gx = (i: number) => (i / (n - 1)) * w;
  const gy = (v: number) => h - (v / 100) * h;
  return (
    <View style={{ height: h, width: w, position: 'relative' }}>
      {series.map(({ data, color }) =>
        Array.from({ length: n - 1 }, (_, i) => {
          const x1 = gx(i),   y1 = gy(data[i]);
          const x2 = gx(i+1), y2 = gy(data[i+1]);
          const dx = x2-x1, dy = y2-y1;
          const len = Math.sqrt(dx*dx + dy*dy);
          const angle = Math.atan2(dy, dx) * (180/Math.PI);
          return (
            <View key={`${color}-${i}`} style={{
              position: 'absolute',
              left: (x1+x2)/2 - len/2,
              top:  (y1+y2)/2 - 1.5,
              width: len, height: 3,
              backgroundColor: color,
              borderRadius: 2, opacity: 0.85,
              transform: [{ rotate: `${angle}deg` }],
            }} />
          );
        })
      )}
    </View>
  );
};

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
    <Text style={[sc.verdict, { color }]}>{verdict}</Text>
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
        <IconSymbol
          size={16}
          name={expanded ? 'chevron.up' : 'chevron.down'}
          color={MUTED}
          style={{ marginLeft: 8 }}
        />
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
  body:       { padding: 14, paddingTop: 0, borderTopWidth: 1, borderTopColor: BORDER, gap: 10 },
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

// ── News item ─────────────────────────────────────────────────────────────────
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

// ── Loading skeleton ──────────────────────────────────────────────────────────
const Skel = ({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) => (
  <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: CARD }} />
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StockScreen() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const [mode, setMode] = useState<Mode>('SHORT');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [data, setData]     = useState<StockAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(() => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    analyzeStock(ticker)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

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
        <Text style={[styles.loadingText, { color: MUTED }]}>
          KRATOS is analysing {ticker}…
        </Text>
        <Text style={[styles.loadingSub, { color: MUTED }]}>
          Scanning fundamentals, narrative, positioning
        </Text>
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

  const masterColor = data.master_color ?? (data.master_recommendation === 'SHORT' ? RED : data.master_recommendation === 'LONG' ? GREEN : AMBER);
  const shortColor  = gradeColor(data.short_mode.letter_grade);
  const longColor   = gradeColor(data.long_mode.letter_grade);

  // ── SHORT MODE render ──────────────────────────────────────────────────────
  const renderShort = () => {
    const s = data.short_mode;
    return (
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 0 }}>
        <ScoreCircle
          score={s.total_score}
          grade={s.letter_grade}
          verdict={s.verdict}
          color={shortColor}
        />

        {/* Fundamental Fragility */}
        <SubScoreCard
          id="ff" score={s.fundamental_fragility.score}
          label={s.fundamental_fragility.label}
          summary={s.fundamental_fragility.summary}
          expanded={expanded.has('ff')} onToggle={toggleExpand}
          colorFn={scoreColor}
        >
          <BulletGroup title="Earnings & Revenue" items={s.fundamental_fragility.earnings_revenue_points} color={RED} />
          <BulletGroup title="Balance Sheet Risk" items={s.fundamental_fragility.balance_sheet_points} color={AMBER} />
          <BulletGroup title="Valuation Excess"   items={s.fundamental_fragility.valuation_points} color={RED} />
        </SubScoreCard>

        {/* Narrative Inflation */}
        <SubScoreCard
          id="ni" score={s.narrative_inflation.score}
          label={s.narrative_inflation.label}
          summary={s.narrative_inflation.summary}
          expanded={expanded.has('ni')} onToggle={toggleExpand}
          colorFn={scoreColor}
        >
          <BulletGroup title="Narrative Intensity" items={s.narrative_inflation.narrative_points} color={RED} />
          <BulletGroup title="Price Action"        items={s.narrative_inflation.price_action_points} color={AMBER} />
          <BulletGroup title="Red Flags"           items={s.narrative_inflation.red_flag_points} color={RED} />
        </SubScoreCard>

        {/* Catalyst Risk */}
        <SubScoreCard
          id="cr" score={s.catalyst_risk.score}
          label={s.catalyst_risk.label}
          summary={s.catalyst_risk.summary}
          expanded={expanded.has('cr')} onToggle={toggleExpand}
          colorFn={scoreColor}
        >
          <BulletGroup title="Upcoming Catalysts" items={s.catalyst_risk.upcoming_catalysts} color={AMBER} />
          <BulletGroup title="Key Points"         items={s.catalyst_risk.points} color={MUTED} />
        </SubScoreCard>
      </Animated.View>
    );
  };

  // ── LONG MODE render ───────────────────────────────────────────────────────
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
        <ScoreCircle
          score={l.total_score}
          grade={l.letter_grade}
          verdict={l.verdict}
          color={longColor}
        />
        {subScores.map(({ id, sub }) => (
          <SubScoreCard
            key={id} id={id} score={sub.score}
            label={sub.label} summary={sub.summary}
            expanded={expanded.has(id)} onToggle={toggleExpand}
            colorFn={scoreColorLong}
          >
            <BulletGroup title="Analysis" items={sub.points} color={longColor} />
          </SubScoreCard>
        ))}
      </Animated.View>
    );
  };

  // ── MARKET IMPACT render ───────────────────────────────────────────────────
  const renderImpact = () => {
    const m = data.market_impact;
    const s = m.sentiment;
    const sentColor = s.overall === 'positive' ? GREEN : s.overall === 'negative' ? RED : MUTED;
    const trendColor = s.narrative_trend === 'increasing' ? RED : s.narrative_trend === 'declining' ? GREEN : MUTED;

    return (
      <Animated.View entering={FadeInDown.springify()} style={{ gap: 14 }}>
        {/* Company overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>COMPANY OVERVIEW</Text>
          <View style={styles.overviewRow}>
            <OverviewChip label="Sector"     value={data.sector}     />
            <OverviewChip label="Industry"   value={data.industry}   />
            <OverviewChip label="Market Cap" value={data.market_cap} />
          </View>
          <Text style={styles.overviewText}>{data.company_overview}</Text>
        </View>

        {/* News */}
        <Text style={[styles.cardTitle, { marginBottom: 4 }]}>LATEST NEWS</Text>
        {m.news.map((n, i) => <NewsCard key={i} item={n} />)}

        {/* Sentiment snapshot */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SENTIMENT SNAPSHOT</Text>
          <View style={styles.sentimentRow}>
            <SentimentChip label="News Sentiment"   value={s.overall}          color={sentColor} />
            <SentimentChip label="Coverage Volume"  value={s.coverage_volume}  color={s.coverage_volume === 'elevated' ? RED : s.coverage_volume === 'moderate' ? AMBER : GREEN} />
            <SentimentChip label="Narrative Trend"  value={s.narrative_trend}  color={trendColor} />
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <IconSymbol size={22} name="chevron.left" color={MUTED} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTicker}>{data.ticker}</Text>
          <Text style={styles.headerName}>{data.name}</Text>
        </View>
        <View style={[styles.masterBadge, { backgroundColor: masterColor + '22' }]}>
          <Text style={[styles.masterText, { color: masterColor }]}>
            {data.master_recommendation}
          </Text>
        </View>
      </View>

      {/* ── Price + chart ───────────────────────────────────────────────────── */}
      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{data.price}</Text>
          <Text style={[styles.change, { color: (data.price_change_1y ?? '').startsWith('+') ? GREEN : RED }]}>
            {data.price_change_1y}  1Y
          </Text>
          <Text style={[styles.priceMeta, { color: MUTED }]}>
            {data.sector}  ·  {data.market_cap}
          </Text>
        </View>
        <MiniChart series={[
          { data: data.chart_data.price,        color: GREEN },
          { data: data.chart_data.sentiment,    color: RED },
          { data: data.chart_data.fundamentals, color: BLUE },
        ]} />
        <View style={styles.chartLegend}>
          <LegendDot color={GREEN} label="Price" />
          <LegendDot color={RED}   label="Sentiment" />
          <LegendDot color={BLUE}  label="Fundamentals" />
        </View>
      </View>

      {/* ── Mode tabs ───────────────────────────────────────────────────────── */}
      <View style={styles.tabs}>
        {([
          { id: 'SHORT',  label: 'SHORT MODE',    color: RED   },
          { id: 'LONG',   label: 'LONG MODE',     color: GREEN },
          { id: 'IMPACT', label: 'MARKET IMPACT', color: BLUE  },
        ] as { id: Mode; label: string; color: string }[]).map(({ id, label, color }) => {
          const active = mode === id;
          return (
            <Pressable
              key={id}
              onPress={() => setMode(id)}
              style={[styles.tab, active && { borderBottomColor: color, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabText, { color: active ? color : MUTED }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'SHORT'  && renderShort()}
        {mode === 'LONG'   && renderLong()}
        {mode === 'IMPACT' && renderImpact()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Small helper components ───────────────────────────────────────────────────
const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    <Text style={{ color: MUTED, fontSize: 11 }}>{label}</Text>
  </View>
);

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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Loading / error
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  loadingTicker: { fontSize: 20, fontWeight: '900', color: '#E6EDF3', letterSpacing: 1 },
  loadingBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 17, fontWeight: '700' },
  loadingSub:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  retryBtn:    { backgroundColor: AMBER + '30', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText:   { color: AMBER, fontWeight: '800', fontSize: 15 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTicker: { fontSize: 22, fontWeight: '900', color: '#E6EDF3', letterSpacing: 1 },
  headerName:   { fontSize: 12, color: MUTED, marginTop: 1 },
  masterBadge:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  masterText:   { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  // Price card
  priceCard: {
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    padding: 16,
    gap: 10,
  },
  priceRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' },
  price:     { fontSize: 28, fontWeight: '900', color: '#E6EDF3' },
  change:    { fontSize: 15, fontWeight: '700' },
  priceMeta: { fontSize: 12 },
  chartLegend: { flexDirection: 'row', gap: 14, justifyContent: 'center' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: CARD,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  // Content
  content: { padding: 16, paddingBottom: 40, gap: 4 },

  // Generic card
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 2 },

  // Bullets
  bulletGroup: { gap: 4 },
  bulletGroupTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
  bulletRow:  { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletDot:  { fontSize: 14, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13, color: '#E6EDF3', lineHeight: 20 },

  // Company overview
  overviewRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  overviewChip: {
    backgroundColor: BG,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  overviewChipLabel: { fontSize: 10, color: MUTED, fontWeight: '600' },
  overviewChipValue: { fontSize: 13, color: '#E6EDF3', fontWeight: '700', marginTop: 2 },
  overviewText: { fontSize: 13, color: MUTED, lineHeight: 20 },

  // News
  newsCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 5,
    marginBottom: 10,
  },
  newsHeadline:   { fontSize: 14, fontWeight: '700', color: '#E6EDF3', lineHeight: 20 },
  newsMeta:       { fontSize: 11 },
  newsSummary:    { fontSize: 12, lineHeight: 18 },
  newsImpactRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  newsImpactLabel:{ fontSize: 12, fontWeight: '700' },
  newsImpactText: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },

  // Sentiment
  sentimentRow:  { flexDirection: 'row', gap: 8 },
  sentimentChip: {
    flex: 1,
    backgroundColor: BG,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  sentimentValue: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  sentimentLabel: { fontSize: 10, color: MUTED, textAlign: 'center' },
});
