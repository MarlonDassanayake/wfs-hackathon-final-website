import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  fetchPortfolioStockData,
  calculatePortfolioMetrics,
  type PortfolioHolding,
} from '@/services/portfolioService';
import {
  generateHedgeRecommendations,
  type HedgeRecommendation,
} from '@/services/gemini';

// ── Theme ─────────────────────────────────────────────────────────────────────
const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';
const PURPLE = '#B388FF';

// Allocation colour palette
const PIE_COLORS = [
  '#00E676', '#00B0FF', '#B388FF', '#FFB74D',
  '#FF5252', '#FF8A65', '#40C4FF', '#EEFF41',
];

// ── Stacked allocation bar (replaces SVG donut) ───────────────────────────────
interface AllocSlice { pct: number; color: string; ticker: string }

function AllocationBar({ slices }: { slices: AllocSlice[] }) {
  if (slices.length === 0) {
    return (
      <View style={ab.wrap}>
        <View style={[ab.bar, { backgroundColor: BORDER }]}>
          <View style={{ flex: 1, backgroundColor: BORDER + '80' }} />
        </View>
        <Text style={ab.empty}>No holdings</Text>
      </View>
    );
  }
  return (
    <View style={ab.wrap}>
      {/* Stacked bar */}
      <View style={ab.bar}>
        {slices.map((s, i) => (
          <View
            key={i}
            style={{
              flex: s.pct / 100,
              backgroundColor: s.color,
              // gap between segments
              marginRight: i < slices.length - 1 ? 2 : 0,
            }}
          />
        ))}
      </View>
      {/* Legend */}
      <View style={ab.legend}>
        {slices.map((s, i) => (
          <View key={i} style={ab.legendItem}>
            <View style={[ab.dot, { backgroundColor: s.color }]} />
            <Text style={ab.legendTicker}>{s.ticker}</Text>
            <Text style={[ab.legendPct, { color: s.color }]}>{s.pct.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const ab = StyleSheet.create({
  wrap:        { width: '100%', gap: 10 },
  bar:         { height: 28, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', backgroundColor: BORDER },
  empty:       { fontSize: 11, color: MUTED, textAlign: 'center' },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  legendTicker:{ fontSize: 11, fontWeight: '700', color: '#E6EDF3' },
  legendPct:   { fontSize: 11, fontWeight: '700' },
});

// ── Risk bar ──────────────────────────────────────────────────────────────────
const RiskBar = ({
  ticker, pct, color,
}: { ticker: string; pct: number; color: string }) => (
  <View style={rb.row}>
    <Text style={rb.ticker}>{ticker}</Text>
    <View style={rb.track}>
      <View style={[rb.fill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
    </View>
    <Text style={[rb.pct, { color }]}>{pct.toFixed(1)}%</Text>
  </View>
);
const rb = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  ticker: { width: 48, fontSize: 12, fontWeight: '700', color: '#E6EDF3' },
  track:  { flex: 1, height: 6, borderRadius: 3, backgroundColor: BORDER, overflow: 'hidden' },
  fill:   { height: 6, borderRadius: 3 },
  pct:    { width: 44, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});

// ── Sector bar ────────────────────────────────────────────────────────────────
const SectorBar = ({ sector, pct }: { sector: string; pct: number }) => {
  const color = pct > 60 ? RED : pct > 40 ? AMBER : GREEN;
  return (
    <View style={sb.row}>
      <Text style={sb.sector} numberOfLines={1}>{sector}</Text>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[sb.pct, { color }]}>{pct.toFixed(1)}%</Text>
    </View>
  );
};
const sb = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sector: { width: 100, fontSize: 12, color: MUTED },
  track:  { flex: 1, height: 6, borderRadius: 3, backgroundColor: BORDER, overflow: 'hidden' },
  fill:   { height: 6, borderRadius: 3 },
  pct:    { width: 44, fontSize: 12, fontWeight: '700', textAlign: 'right' },
});

// ── Metric card ───────────────────────────────────────────────────────────────
const MetricCard = ({
  label, value, color, sub,
}: { label: string; value: string; color: string; sub?: string }) => (
  <View style={mc.card}>
    <Text style={[mc.value, { color }]}>{value}</Text>
    <Text style={mc.label}>{label}</Text>
    {sub ? <Text style={mc.sub}>{sub}</Text> : null}
  </View>
);
const mc = StyleSheet.create({
  card:  { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 12, alignItems: 'center', gap: 3 },
  value: { fontSize: 20, fontWeight: '900' },
  label: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 1, textAlign: 'center' },
  sub:   { fontSize: 10, color: MUTED, textAlign: 'center' },
});

// ── Hedge card ────────────────────────────────────────────────────────────────
const HedgeCard = ({
  title, instruments, reason, accent,
}: { title: string; instruments: string[]; reason: string; accent: string }) => (
  <View style={[hc.card, { borderColor: accent + '40' }]}>
    <View style={hc.titleRow}>
      <View style={[hc.dot, { backgroundColor: accent }]} />
      <Text style={[hc.title, { color: accent }]}>{title}</Text>
    </View>
    <View style={hc.instruments}>
      {instruments.map((inst, i) => (
        <View key={i} style={[hc.instBadge, { backgroundColor: accent + '18' }]}>
          <Text style={[hc.instText, { color: accent }]}>{inst}</Text>
        </View>
      ))}
    </View>
    <Text style={hc.reason}>{reason}</Text>
  </View>
);
const hc = StyleSheet.create({
  card:        { backgroundColor: CARD, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10, marginBottom: 10 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  title:       { fontSize: 14, fontWeight: '800' },
  instruments: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  instBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  instText:    { fontSize: 11, fontWeight: '700' },
  reason:      { fontSize: 12, color: MUTED, lineHeight: 18 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function PortfolioScreen() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);

  // Search / add state
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResult,  setSearchResult]  = useState<{
    ticker: string; name: string; price: number; beta: number; sector: string; volatility: number;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError,   setSearchError]   = useState<string | null>(null);
  const [qtyText,       setQtyText]       = useState('1');

  // Hedge state
  const [hedgeData,    setHedgeData]    = useState<HedgeRecommendation | null>(null);
  const [hedgeLoading, setHedgeLoading] = useState(false);
  const [hedgeError,   setHedgeError]   = useState<string | null>(null);

  const metrics = useMemo(() => calculatePortfolioMetrics(holdings), [holdings]);

  // ── Search for a stock ──────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const t = searchQuery.toUpperCase().trim();
    if (!t) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const data = await fetchPortfolioStockData(t);
      setSearchResult({
        ticker: t,
        name: data.quote.name,
        price: parseFloat(data.quote.priceFormatted.replace(/[$,]/g, '')) || 0,
        beta: data.beta,
        sector: data.sector,
        volatility: data.volatility,
      });
    } catch (e: any) {
      setSearchError(e.message ?? 'Failed to fetch stock data');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  // ── Add to portfolio ────────────────────────────────────────────────────────
  const handleAdd = useCallback(() => {
    if (!searchResult) return;
    const qty = Math.max(1, parseInt(qtyText, 10) || 1);
    const value = searchResult.price * qty;

    setHoldings((prev) => {
      if (prev.find((h) => h.ticker === searchResult.ticker)) {
        return prev.map((h) =>
          h.ticker === searchResult.ticker
            ? { ...h, quantity: h.quantity + qty, allocation: h.allocation + value }
            : h,
        );
      }
      return [
        ...prev,
        {
          ticker: searchResult.ticker,
          name: searchResult.name,
          livePrice: searchResult.price,
          quantity: qty,
          allocation: value,
          beta: searchResult.beta,
          sector: searchResult.sector,
          volatility: searchResult.volatility,
        },
      ];
    });
    setHedgeData(null);
    setSearchQuery('');
    setSearchResult(null);
    setQtyText('1');
  }, [searchResult, qtyText]);

  // ── Remove holding ──────────────────────────────────────────────────────────
  const handleRemove = useCallback((ticker: string) => {
    setHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
    setHedgeData(null);
  }, []);

  // ── Adjust allocation ───────────────────────────────────────────────────────
  const adjustAllocation = useCallback((ticker: string, delta: number) => {
    setHoldings((prev) => {
      const total = prev.reduce((s, h) => s + h.allocation, 0);
      const current = prev.find((h) => h.ticker === ticker);
      if (!current) return prev;
      const currentPct = total > 0 ? (current.allocation / total) * 100 : 100 / prev.length;
      const newPct = Math.max(5, Math.min(80, currentPct + delta));
      const diff = newPct - currentPct;
      const others = prev.filter((h) => h.ticker !== ticker);
      const othersTotal = others.reduce((s, h) => s + h.allocation, 0);
      return prev.map((h) => {
        if (h.ticker === ticker) return { ...h, allocation: (newPct / 100) * total };
        if (othersTotal === 0) return h;
        const share = h.allocation / othersTotal;
        return { ...h, allocation: Math.max(0, h.allocation - share * (diff / 100) * total) };
      });
    });
    setHedgeData(null);
  }, []);

  // ── Generate hedge recommendations ──────────────────────────────────────────
  const handleGenerateHedge = useCallback(async () => {
    if (holdings.length === 0) return;
    setHedgeLoading(true);
    setHedgeError(null);
    try {
      const totalAlloc = holdings.reduce((s, h) => s + h.allocation, 0);
      const portfolioArg = holdings.map((h) => ({
        ticker: h.ticker,
        sector: h.sector,
        weight: h.allocation / (totalAlloc || 1),
        beta: h.beta,
      }));
      const result = await generateHedgeRecommendations(portfolioArg, {
        beta: metrics.beta,
        volatility: metrics.volatility,
        sharpe: metrics.sharpe,
        sectorConcentration: metrics.sectorConcentration,
      });
      setHedgeData(result);
    } catch (e: any) {
      setHedgeError(e.message ?? 'Failed to generate hedge recommendations');
    } finally {
      setHedgeLoading(false);
    }
  }, [holdings, metrics]);

  // ── Allocation slices ───────────────────────────────────────────────────────
  const allocSlices = useMemo<AllocSlice[]>(() => {
    const total = holdings.reduce((s, h) => s + h.allocation, 0);
    if (total === 0) return [];
    return holdings.map((h, i) => ({
      ticker: h.ticker,
      pct: (h.allocation / total) * 100,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [holdings]);

  function holdingPct(h: PortfolioHolding): number {
    const total = holdings.reduce((s, x) => s + x.allocation, 0);
    return total > 0 ? (h.allocation / total) * 100 : 0;
  }

  function betaLabel(b: number): { label: string; color: string } {
    if (b > 1.3)  return { label: 'AGGRESSIVE', color: RED };
    if (b > 1.0)  return { label: 'ELEVATED',   color: AMBER };
    if (b > 0.7)  return { label: 'MODERATE',   color: GREEN };
    return           { label: 'DEFENSIVE',   color: BLUE };
  }

  const bInfo = betaLabel(metrics.beta);
  const hasSectorRisk = Object.values(metrics.sectorConcentration).some((v) => v > 60);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Section 1 Header ──────────────────────────────────────────────── */}
          <Animated.View entering={FadeIn.duration(400)} style={styles.sectionHeader}>
            <IconSymbol size={16} name="briefcase.fill" color={GREEN} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>FACTOR BASED INVESTMENT</Text>
              <Text style={[styles.sectionSub, { color: MUTED }]}>& RISK ASSESSMENT PROFILE</Text>
            </View>
          </Animated.View>

          {/* ── Add stock panel ──────────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.addPanel}>
            <Text style={styles.panelTitle}>ADD STOCK</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.tickerInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="TICKER (e.g. AAPL)"
                placeholderTextColor={MUTED}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              <Pressable
                onPress={handleSearch}
                disabled={searchLoading || !searchQuery.trim()}
                style={[styles.searchBtn, (!searchQuery.trim()) && { opacity: 0.5 }]}
              >
                {searchLoading
                  ? <ActivityIndicator size="small" color={BG} />
                  : <IconSymbol size={18} name="magnifyingglass" color={BG} />
                }
              </Pressable>
            </View>

            {searchError && (
              <Text style={styles.searchError}>{searchError}</Text>
            )}

            {searchResult && (
              <View style={styles.searchResultBox}>
                <Text style={styles.searchResultName} numberOfLines={1}>{searchResult.name}</Text>
                <Text style={styles.searchResultMeta}>
                  ${searchResult.price.toFixed(2)}  ·  β {searchResult.beta.toFixed(2)}  ·  {searchResult.sector}
                </Text>
                <View style={styles.qtyRow}>
                  <Text style={styles.qtyLabel}>Quantity:</Text>
                  <TextInput
                    style={styles.qtyInput}
                    value={qtyText}
                    onChangeText={setQtyText}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Text style={[styles.qtyLabel, { color: MUTED }]}>shares</Text>
                </View>
                <Pressable onPress={handleAdd} style={styles.addBtn}>
                  <IconSymbol size={14} name="plus" color={BG} />
                  <Text style={styles.addBtnText}>Add to Portfolio</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>

          {/* ── Allocation bar ───────────────────────────────────────────────── */}
          {holdings.length > 0 && (
            <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.allocCard}>
              <Text style={styles.cardLabel}>PORTFOLIO ALLOCATION</Text>
              <AllocationBar slices={allocSlices} />
            </Animated.View>
          )}

          {/* ── Holdings list ────────────────────────────────────────────────── */}
          {holdings.length > 0 && (
            <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.holdingsCard}>
              <Text style={styles.cardLabel}>HOLDINGS</Text>
              {holdings.map((h, i) => {
                const color = PIE_COLORS[i % PIE_COLORS.length];
                const pct = holdingPct(h);
                const rc = metrics.riskContributions.find((r) => r.ticker === h.ticker);
                return (
                  <View key={h.ticker} style={styles.holdingRow}>
                    <View style={[styles.holdingColor, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.holdingTop}>
                        <Text style={[styles.holdingTicker, { color }]}>{h.ticker}</Text>
                        <Text style={styles.holdingName} numberOfLines={1}>{h.name}</Text>
                      </View>
                      {rc && (
                        <Text style={styles.holdingRisk}>
                          Risk contribution: {rc.contribution.toFixed(1)}%
                        </Text>
                      )}
                    </View>
                    <View style={styles.holdingAlloc}>
                      <Pressable
                        onPress={() => adjustAllocation(h.ticker, -5)}
                        style={styles.allocBtn}
                      >
                        <Text style={styles.allocBtnText}>−5%</Text>
                      </Pressable>
                      <Text style={[styles.allocPct, { color }]}>{pct.toFixed(1)}%</Text>
                      <Pressable
                        onPress={() => adjustAllocation(h.ticker, 5)}
                        style={styles.allocBtn}
                      >
                        <Text style={styles.allocBtnText}>+5%</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => handleRemove(h.ticker)} hitSlop={8} style={{ paddingLeft: 8 }}>
                      <IconSymbol size={16} name="xmark.circle.fill" color={MUTED} />
                    </Pressable>
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* ── Portfolio Metrics ─────────────────────────────────────────────── */}
          {holdings.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <Text style={styles.cardLabel}>PORTFOLIO METRICS</Text>
              <View style={styles.metricsRow}>
                <MetricCard
                  label="PORTFOLIO β"
                  value={metrics.beta.toFixed(2)}
                  color={bInfo.color}
                  sub={bInfo.label}
                />
                <MetricCard
                  label="VOLATILITY σ"
                  value={`${(metrics.volatility * 100).toFixed(1)}%`}
                  color={metrics.volatility > 0.35 ? RED : metrics.volatility > 0.20 ? AMBER : GREEN}
                />
                <MetricCard
                  label="SHARPE"
                  value={metrics.sharpe.toFixed(2)}
                  color={metrics.sharpe > 1 ? GREEN : metrics.sharpe > 0.5 ? AMBER : RED}
                />
                <MetricCard
                  label="ALPHA"
                  value={`${metrics.alpha >= 0 ? '+' : ''}${(metrics.alpha * 100).toFixed(1)}%`}
                  color={metrics.alpha >= 0 ? GREEN : RED}
                />
              </View>
            </Animated.View>
          )}

          {/* ── Risk contributions ───────────────────────────────────────────── */}
          {holdings.length > 0 && metrics.riskContributions.length > 0 && (
            <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
              <Text style={styles.cardLabel}>RISK CONTRIBUTION PER STOCK</Text>
              {[...metrics.riskContributions]
                .sort((a, b) => b.contribution - a.contribution)
                .map((rc) => {
                  const hi = holdings.findIndex((h) => h.ticker === rc.ticker);
                  const color = PIE_COLORS[hi % PIE_COLORS.length];
                  return (
                    <RiskBar key={rc.ticker} ticker={rc.ticker} pct={rc.contribution} color={color} />
                  );
                })}
            </Animated.View>
          )}

          {/* ── Section 2: Hedge ──────────────────────────────────────────────── */}
          {holdings.length > 0 && (
            <>
              <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.sectionHeader}>
                <IconSymbol size={16} name="shield.fill" color={PURPLE} />
                <Text style={[styles.sectionTitle, { color: PURPLE }]}>HEDGE MY PORTFOLIO</Text>
              </Animated.View>

              {/* Portfolio Beta card */}
              <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.card}>
                <View style={styles.betaCardRow}>
                  <View>
                    <Text style={styles.cardLabel}>PORTFOLIO BETA</Text>
                    <Text style={[styles.betaBig, { color: bInfo.color }]}>{metrics.beta.toFixed(2)}</Text>
                    <View style={[styles.betaBadge, { backgroundColor: bInfo.color + '20' }]}>
                      <Text style={[styles.betaBadgeText, { color: bInfo.color }]}>{bInfo.label}</Text>
                    </View>
                  </View>
                  <View style={styles.betaBaseline}>
                    <Text style={styles.betaBaseText}>S&P 500</Text>
                    <Text style={[styles.betaBaseVal, { color: MUTED }]}>1.0 baseline</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Sector concentration */}
              <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.card}>
                <Text style={styles.cardLabel}>SECTOR CONCENTRATION</Text>
                {Object.entries(metrics.sectorConcentration)
                  .sort(([, a], [, b]) => b - a)
                  .map(([sector, pct]) => (
                    <SectorBar key={sector} sector={sector} pct={pct} />
                  ))}
                {hasSectorRisk && (
                  <View style={styles.warningRow}>
                    <IconSymbol size={13} name="exclamationmark.triangle.fill" color={AMBER} />
                    <Text style={styles.warningText}>High sector concentration risk detected</Text>
                  </View>
                )}
              </Animated.View>

              {/* Hedge button */}
              {!hedgeData && (
                <Animated.View entering={FadeInDown.delay(360).springify()}>
                  <Pressable
                    onPress={handleGenerateHedge}
                    disabled={hedgeLoading}
                    style={[styles.hedgeBtn, hedgeLoading && { opacity: 0.6 }]}
                  >
                    {hedgeLoading ? (
                      <>
                        <ActivityIndicator size="small" color={BG} />
                        <Text style={styles.hedgeBtnText}>ALETHEIA is building your hedge…</Text>
                      </>
                    ) : (
                      <>
                        <IconSymbol size={18} name="shield.fill" color={BG} />
                        <Text style={styles.hedgeBtnText}>Generate Hedge Recommendations</Text>
                      </>
                    )}
                  </Pressable>
                  {hedgeError && (
                    <Text style={styles.hedgeError}>{hedgeError}</Text>
                  )}
                </Animated.View>
              )}

              {/* Hedge results */}
              {hedgeData && (
                <Animated.View entering={FadeInDown.springify()}>
                  {/* Risk Exposure Summary */}
                  <View style={[styles.card, { borderColor: PURPLE + '40' }]}>
                    <Text style={[styles.cardLabel, { color: PURPLE }]}>RISK EXPOSURE SUMMARY</Text>
                    <Text style={styles.insightText}>{hedgeData.aletheiaInsight}</Text>
                  </View>

                  {/* Hedge recommendations */}
                  <Text style={styles.cardLabel}>HEDGE RECOMMENDATIONS</Text>
                  <HedgeCard
                    title={hedgeData.hedge1.title}
                    instruments={hedgeData.hedge1.instruments}
                    reason={hedgeData.hedge1.reason}
                    accent={GREEN}
                  />
                  <HedgeCard
                    title={hedgeData.hedge2.title}
                    instruments={hedgeData.hedge2.instruments}
                    reason={hedgeData.hedge2.reason}
                    accent={BLUE}
                  />
                  <HedgeCard
                    title={hedgeData.hedge3.title}
                    instruments={hedgeData.hedge3.instruments}
                    reason={hedgeData.hedge3.reason}
                    accent={AMBER}
                  />

                  {/* Risk Reduction Simulation */}
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>RISK REDUCTION SIMULATION</Text>
                    <View style={styles.simRow}>
                      <View style={styles.simItem}>
                        <Text style={styles.simLabel}>Current Beta</Text>
                        <Text style={[styles.simValue, { color: bInfo.color }]}>{metrics.beta.toFixed(2)}</Text>
                      </View>
                      <IconSymbol size={20} name="arrow.right" color={MUTED} />
                      <View style={styles.simItem}>
                        <Text style={styles.simLabel}>After Hedge</Text>
                        <Text style={[styles.simValue, { color: GREEN }]}>{hedgeData.hedgeBeta.toFixed(2)}</Text>
                      </View>
                    </View>
                    <View style={[styles.simReduction, { backgroundColor: GREEN + '18', borderColor: GREEN + '40' }]}>
                      <IconSymbol size={14} name="arrow.down.circle.fill" color={GREEN} />
                      <Text style={[styles.simReductionText, { color: GREEN }]}>
                        Projected Volatility Reduction: −{hedgeData.volatilityReduction}%
                      </Text>
                    </View>
                  </View>

                  {/* Recalculate */}
                  <Pressable onPress={() => { setHedgeData(null); setHedgeError(null); }} style={styles.recalcBtn}>
                    <Text style={styles.recalcText}>Recalculate Hedge</Text>
                  </Pressable>
                </Animated.View>
              )}
            </>
          )}

          {/* ── Empty state ───────────────────────────────────────────────────── */}
          {holdings.length === 0 && (
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.emptyState}>
              <IconSymbol size={48} name="briefcase" color={MUTED} />
              <Text style={styles.emptyTitle}>No holdings yet</Text>
              <Text style={styles.emptyBody}>
                Search for a stock above and add it to your portfolio to get factor-based risk analysis and hedge recommendations.
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 60 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: GREEN, letterSpacing: 1.5 },
  sectionSub:   { fontSize: 10, letterSpacing: 1, marginTop: 1 },

  // Add panel
  addPanel: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  panelTitle: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1.5 },

  searchRow: { flexDirection: 'row', gap: 8 },
  tickerInput: {
    flex: 1,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#E6EDF3',
    letterSpacing: 1,
  },
  searchBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchError: { fontSize: 11, color: RED },

  searchResultBox: { gap: 8 },
  searchResultName: { fontSize: 13, fontWeight: '700', color: '#E6EDF3' },
  searchResultMeta: { fontSize: 11, color: MUTED },
  qtyRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyLabel: { fontSize: 12, color: '#E6EDF3' },
  qtyInput: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#E6EDF3',
    width: 72,
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addBtnText: { color: BG, fontWeight: '800', fontSize: 14 },

  // Allocation bar card
  allocCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },

  // Holdings
  holdingsCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  holdingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  holdingColor:  { width: 4, height: 44, borderRadius: 2, flexShrink: 0 },
  holdingTop:    { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  holdingTicker: { fontSize: 15, fontWeight: '900' },
  holdingName:   { fontSize: 11, color: MUTED, flex: 1 },
  holdingRisk:   { fontSize: 10, color: MUTED, marginTop: 2 },
  holdingAlloc:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  allocBtn:      { backgroundColor: BORDER, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 6 },
  allocBtnText:  { fontSize: 10, fontWeight: '700', color: '#E6EDF3' },
  allocPct:      { fontSize: 13, fontWeight: '800', width: 44, textAlign: 'center' },

  // Metrics
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },

  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  cardLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1.5, marginBottom: 2 },

  // Beta card
  betaCardRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  betaBig:       { fontSize: 40, fontWeight: '900' },
  betaBadge:     { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  betaBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  betaBaseline:  { alignItems: 'flex-end' },
  betaBaseText:  { fontSize: 11, fontWeight: '700', color: MUTED },
  betaBaseVal:   { fontSize: 16, fontWeight: '800', marginTop: 2 },

  // Warning
  warningRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  warningText: { fontSize: 12, color: AMBER },

  // Hedge btn
  hedgeBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  hedgeBtnText: { color: BG, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  hedgeError:   { fontSize: 12, color: RED, marginBottom: 10, textAlign: 'center' },

  // Insight
  insightText: { fontSize: 13, color: '#C9D1D9', lineHeight: 20 },

  // Sim
  simRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 8 },
  simItem:          { alignItems: 'center', gap: 4 },
  simLabel:         { fontSize: 11, color: MUTED, fontWeight: '600' },
  simValue:         { fontSize: 28, fontWeight: '900' },
  simReduction:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  simReductionText: { fontSize: 13, fontWeight: '700' },

  recalcBtn:  { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
  recalcText: { fontSize: 12, color: MUTED, textDecorationLine: 'underline' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: MUTED },
  emptyBody:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
});
