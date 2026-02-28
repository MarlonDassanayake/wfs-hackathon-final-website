import { IconSymbol } from '@/components/ui/IconSymbol';
import { analyzeStock, getLandingData, type LandingData, type LandingPick } from '@/services/gemini';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';

// ── Pick card — simplified ────────────────────────────────────────────────────
const PickCard = ({ pick, side }: { pick: LandingPick; side: 'short' | 'long' }) => {
  const accent = side === 'short' ? RED : GREEN;
  const rec: 'SHORT' | 'LONG' = side === 'short' ? 'SHORT' : 'LONG';
  return (
    <Pressable
      onPress={() => router.push(`/stock/${pick.ticker}?rec=${rec}` as any)}
      style={[styles.pickCard, { borderColor: accent + '40' }]}
    >
      <View style={styles.pickTop}>
        <Text style={[styles.pickTicker, { color: accent }]}>{pick.ticker}</Text>
        <View style={[styles.gradeBadge, { backgroundColor: accent + '20' }]}>
          <Text style={[styles.gradeText, { color: accent }]}>{pick.letter_grade}</Text>
        </View>
      </View>
      <Text style={styles.pickName} numberOfLines={1}>{pick.name}</Text>
      <View style={styles.pickScoreRow}>
        <Text style={[styles.pickScoreLabel, { color: MUTED }]}>Score</Text>
        <Text style={[styles.pickScore, { color: accent }]}>{pick.score}/100</Text>
      </View>
    </Pressable>
  );
};

// ── Skeleton placeholder ──────────────────────────────────────────────────────
const Skeleton = ({ w, h, r = 6 }: { w: number | string; h: number; r?: number }) => (
  <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: CARD, opacity: 0.6 }} />
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [query, setQuery]     = useState('');
  const [data, setData]       = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    getLandingData()
      .then((d) => {
        setData(d);
        // Pre-warm analysis AND update scores with the real analysis values
        // (landing data scores come from a quick Gemini call; analyzeStock is more accurate)
        const picks = [
          ...d.top_shorts.map((p) => ({ ticker: p.ticker, rec: 'SHORT' as const, side: 'short' as const })),
          ...d.top_longs.map((p)  => ({ ticker: p.ticker, rec: 'LONG'  as const, side: 'long'  as const })),
        ];
        picks.forEach(async ({ ticker, rec, side }) => {
          try {
            const analysis = await analyzeStock(ticker, undefined, rec);
            const score = side === 'short'
              ? analysis.short_mode.total_score
              : analysis.long_mode.total_score;
            const letter_grade = side === 'short'
              ? analysis.short_mode.letter_grade
              : analysis.long_mode.letter_grade;
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                top_shorts: side === 'short'
                  ? prev.top_shorts.map((p) => p.ticker === ticker ? { ...p, score, letter_grade } : p)
                  : prev.top_shorts,
                top_longs: side === 'long'
                  ? prev.top_longs.map((p) => p.ticker === ticker ? { ...p, score, letter_grade } : p)
                  : prev.top_longs,
              };
            });
          } catch { /* silent — pre-warm failure is non-fatal */ }
        });
      })
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: 80, height: 80, borderRadius: 10 }}
            contentFit="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.appName}>ALETHEIA</Text>
            <Text style={[styles.appSub, { color: MUTED }]}>Personal Hedge Fund</Text>
          </View>
        </Animated.View>

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.searchSection}>
          <View style={styles.searchBox}>
            <IconSymbol size={20} name="magnifyingglass" color={MUTED} style={styles.searchIcon} />
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
            <Text style={styles.analyzeBtnText}>Analyse</Text>
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
          {/* Short picks */}
          <View style={styles.picksCol}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={14} name="arrow.down.circle.fill" color={RED} />
              <Text style={[styles.sectionTitle, { color: RED }]}>TOP SHORTS</Text>
            </View>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={[styles.pickCard, { borderColor: RED + '30', gap: 8 }]}>
                    <Skeleton w="55%" h={18} />
                    <Skeleton w="80%" h={11} />
                    <Skeleton w="100%" h={14} r={4} />
                  </View>
                ))
              : data?.top_shorts.map((p) => <PickCard key={p.ticker} pick={p} side="short" />)
            }
          </View>

          {/* Long picks */}
          <View style={styles.picksCol}>
            <View style={styles.sectionHeader}>
              <IconSymbol size={14} name="arrow.up.circle.fill" color={GREEN} />
              <Text style={[styles.sectionTitle, { color: GREEN }]}>TOP LONGS</Text>
            </View>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <View key={i} style={[styles.pickCard, { borderColor: GREEN + '30', gap: 8 }]}>
                    <Skeleton w="55%" h={18} />
                    <Skeleton w="80%" h={11} />
                    <Skeleton w="100%" h={14} r={4} />
                  </View>
                ))
              : data?.top_longs.map((p) => <PickCard key={p.ticker} pick={p} side="long" />)
            }
          </View>
        </Animated.View>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={GREEN} />
            <Text style={[styles.loadingText, { color: MUTED }]}>
              ALETHEIA is scanning the market…
            </Text>
          </View>
        )}

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
    marginBottom: 24,
    paddingTop: 4,
  },
  headerText: { flex: 1 },
  appName: { fontSize: 40, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3},
  appSub:  { fontSize: 13, letterSpacing: 1, marginTop: 3, color: MUTED},

  // Search
  searchSection: { marginBottom: 28 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    marginTop: 12
  },
  searchIcon:  { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#E6EDF3',
    letterSpacing: 1,
  },
  analyzeBtn: {
    backgroundColor: '#1E88E5',
    borderRadius: 100,
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
  picksSection: { flexDirection: 'row', gap: 10 },
  picksCol:     { flex: 1, gap: 8 },
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
    gap: 5,
  },
  pickTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickTicker:     { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  gradeBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  gradeText:      { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  pickName:       { fontSize: 11, fontWeight: '600', color: '#C9D1D9' },
  pickScoreRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  pickScoreLabel: { fontSize: 11, fontWeight: '600', color: MUTED },
  pickScore:      { fontSize: 14, fontWeight: '900' },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  loadingText: { fontSize: 13 },
});
