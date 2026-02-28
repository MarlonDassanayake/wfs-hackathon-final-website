import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { getLandingData, type LandingPick, type LandingNewsItem, type LandingData } from '@/services/gemini';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';

const { width } = Dimensions.get('window');

// ── Grade colour ──────────────────────────────────────────────────────────────
function gradeColor(g: string) {
  if (!g) return MUTED;
  if (['AAA','AA','A'].includes(g)) return GREEN;
  if (['BBB','BB'].includes(g)) return AMBER;
  return RED;
}

// ── Impact colour ─────────────────────────────────────────────────────────────
function impactColor(i: string) {
  if (i === 'positive') return GREEN;
  if (i === 'negative') return RED;
  return MUTED;
}

// ── Pick card ─────────────────────────────────────────────────────────────────
const PickCard = ({ pick, side }: { pick: LandingPick; side: 'short' | 'long' }) => {
  const accent = side === 'short' ? RED : GREEN;
  return (
    <Pressable
      onPress={() => router.push(`/stock/${pick.ticker}` as any)}
      style={[styles.pickCard, { borderColor: accent + '40' }]}
    >
      <View style={styles.pickTop}>
        <Text style={[styles.pickTicker, { color: accent }]}>{pick.ticker}</Text>
        <View style={[styles.gradeBadge, { backgroundColor: accent + '20' }]}>
          <Text style={[styles.gradeText, { color: accent }]}>{pick.letter_grade}</Text>
        </View>
      </View>
      <Text style={styles.pickName}>{pick.name}</Text>
      <Text style={[styles.pickSector, { color: MUTED }]}>{pick.sector}</Text>
      <Text style={[styles.pickReason, { color: MUTED }]}>{pick.reason}</Text>
      <View style={styles.pickScoreRow}>
        <Text style={[styles.pickScoreLabel, { color: MUTED }]}>Score</Text>
        <Text style={[styles.pickScore, { color: accent }]}>{pick.score}/100</Text>
      </View>
    </Pressable>
  );
};

// ── News card ─────────────────────────────────────────────────────────────────
const NewsCard = ({ item }: { item: LandingNewsItem }) => {
  const color = impactColor(item.impact);
  const icon  = item.impact === 'positive' ? 'arrow.up.circle.fill'
               : item.impact === 'negative' ? 'arrow.down.circle.fill'
               : 'minus.circle.fill';
  return (
    <View style={styles.newsCard}>
      <Text style={styles.newsHeadline}>{item.headline}</Text>
      <Text style={[styles.newsSource, { color: MUTED }]}>{item.source}</Text>
      <View style={styles.newsImpactRow}>
        <IconSymbol size={14} name={icon} color={color} />
        <Text style={[styles.newsImpactText, { color }]}>{item.impact_text}</Text>
      </View>
      {item.tickers_affected?.length > 0 && (
        <View style={styles.newsTickerRow}>
          {item.tickers_affected.map((t) => (
            <Pressable
              key={t}
              onPress={() => router.push(`/stock/${t}` as any)}
              style={styles.newsTicker}
            >
              <Text style={[styles.newsTickerText, { color: BLUE }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

// ── Skeleton placeholder ─────────────────────────────────────────────────────
const Skeleton = ({ w, h, r = 6 }: { w: number | string; h: number; r?: number }) => (
  <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: CARD, opacity: 0.6 }} />
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [query, setQuery]       = useState('');
  const [data, setData]         = useState<LandingData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    getLandingData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = useCallback((t?: string) => {
    const ticker = (t ?? query).toUpperCase().trim();
    if (!ticker) return;
    router.push(`/stock/${ticker}` as any);
  }, [query]);

  const retry = () => {
    setLoading(true);
    setError(null);
    getLandingData()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <IconSymbol size={36} name="chart.bar.fill" color={GREEN} />
          <View style={styles.headerText}>
            <Text style={styles.appName}>KRATOS</Text>
            <Text style={[styles.appSub, { color: MUTED }]}>Personal Hedge Fund</Text>
          </View>
        </Animated.View>

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.searchSection}>
          <Text style={styles.searchPrompt}>What should the market fear next?</Text>
          <View style={styles.searchBox}>
            <IconSymbol size={22} name="magnifyingglass" color={MUTED} style={styles.searchIcon} />
            <TextInput
              placeholder="Enter stock name or ticker…"
              placeholderTextColor={MUTED}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => handleSearch()}
              style={styles.searchInput}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              maxLength={10}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <IconSymbol size={18} name="xmark.circle.fill" color={MUTED} />
              </Pressable>
            )}
          </View>
          <Pressable onPress={() => handleSearch()} style={styles.analyzeBtn}>
            <Text style={styles.analyzeBtnText}>Analyze</Text>
            <IconSymbol size={18} name="arrow.right" color="#0D1117" style={{ marginLeft: 8 }} />
          </Pressable>
        </Animated.View>

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {error && (
          <View style={styles.errorBanner}>
            <IconSymbol size={16} name="exclamationmark.triangle.fill" color={AMBER} />
            <Text style={[styles.errorText, { color: AMBER }]}>{error}</Text>
            <Pressable onPress={retry} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* ── Top Picks ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.picksSection}>
          {/* Shorts */}
          <View style={styles.picksCol}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={14} name="arrow.down.circle.fill" color={RED} />
              <Text style={[styles.sectionTitle, { color: RED }]}>TOP SHORT PICKS</Text>
            </View>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={[styles.pickCard, { borderColor: RED + '30', gap: 8 }]}>
                    <Skeleton w="50%" h={16} />
                    <Skeleton w="80%" h={12} />
                    <Skeleton w="100%" h={24} r={4} />
                  </View>
                ))
              : data?.top_shorts.map((p) => <PickCard key={p.ticker} pick={p} side="short" />)
            }
          </View>

          {/* Longs */}
          <View style={styles.picksCol}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={14} name="arrow.up.circle.fill" color={GREEN} />
              <Text style={[styles.sectionTitle, { color: GREEN }]}>TOP LONG PICKS</Text>
            </View>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={[styles.pickCard, { borderColor: GREEN + '30', gap: 8 }]}>
                    <Skeleton w="50%" h={16} />
                    <Skeleton w="80%" h={12} />
                    <Skeleton w="100%" h={24} r={4} />
                  </View>
                ))
              : data?.top_longs.map((p) => <PickCard key={p.ticker} pick={p} side="long" />)
            }
          </View>
        </Animated.View>

        {/* ── Market News ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.newsSection}>
          <View style={styles.sectionHeader}>
            <IconSymbol size={14} name="newspaper.fill" color={BLUE} />
            <Text style={[styles.sectionTitle, { color: BLUE }]}>MARKET NEWS + IMPACT</Text>
          </View>

          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <View key={i} style={[styles.newsCard, { gap: 8 }]}>
                  <Skeleton w="90%" h={14} />
                  <Skeleton w="40%" h={10} />
                  <Skeleton w="100%" h={20} r={4} />
                </View>
              ))
            : data?.market_news.map((n, i) => <NewsCard key={i} item={n} />)
          }

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={GREEN} />
              <Text style={[styles.loadingText, { color: MUTED }]}>
                KRATOS AI is scanning the market…
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
    paddingTop: 4,
  },
  headerText: { flex: 1 },
  appName: { fontSize: 24, fontWeight: '900', color: GREEN, letterSpacing: 4 },
  appSub:  { fontSize: 12, letterSpacing: 1, marginTop: 2 },

  // Search
  searchSection: { marginBottom: 32 },
  searchPrompt: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E6EDF3',
    marginBottom: 16,
    lineHeight: 30,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#E6EDF3',
    letterSpacing: 1,
  },
  analyzeBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnText: {
    color: '#0D1117',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
  },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AMBER + '18',
    borderWidth: 1,
    borderColor: AMBER + '40',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13 },
  retryBtn: {
    backgroundColor: AMBER + '30',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryText: { color: AMBER, fontWeight: '700', fontSize: 12 },

  // Picks
  picksSection: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  picksCol: { flex: 1, gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  pickCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  pickTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickTicker: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  gradeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  gradeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  pickName: { fontSize: 12, fontWeight: '600', color: '#E6EDF3' },
  pickSector: { fontSize: 11, marginBottom: 2 },
  pickReason: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  pickScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  pickScoreLabel: { fontSize: 11, fontWeight: '600' },
  pickScore: { fontSize: 14, fontWeight: '900' },

  // News
  newsSection: { gap: 10 },
  newsCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  newsHeadline: { fontSize: 14, fontWeight: '700', color: '#E6EDF3', lineHeight: 20 },
  newsSource: { fontSize: 11 },
  newsImpactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  newsImpactText: { fontSize: 12, flex: 1, lineHeight: 18 },
  newsTickerRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  newsTicker: {
    backgroundColor: BLUE + '18',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newsTickerText: { fontSize: 11, fontWeight: '800' },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  loadingText: { fontSize: 13 },
});
