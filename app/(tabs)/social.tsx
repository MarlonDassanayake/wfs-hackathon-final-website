import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import {
  fetchFearGreed,
  fetchRedditPosts,
  fetchMarketNews,
  fetchXPulse,
  type FearGreedData,
  type RedditPost,
  type NewsItem,
  type XPulseItem,
} from '@/services/social';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';
const PURPLE = '#B388FF';

const { width } = Dimensions.get('window');
const GAUGE_W = width - 64;

// ── Fear & Greed Gauge ────────────────────────────────────────────────────────
function fngColor(score: number): string {
  if (score <= 20) return '#FF3B3B';
  if (score <= 40) return '#FF8C00';
  if (score <= 60) return AMBER;
  if (score <= 80) return '#8BC34A';
  return '#00E676';
}

function fngLabel(rating: string): string {
  return (rating ?? '')
    .split(/[_ ]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

const FearGreedGauge = ({ data }: { data: FearGreedData }) => {
  const color = fngColor(data.score);
  const pct   = data.score / 100;
  const indicatorLeft = Math.max(0, Math.min(pct * GAUGE_W - 8, GAUGE_W - 16));

  const segments = [
    { color: '#FF3B3B', flex: 20 },
    { color: '#FF8C00', flex: 20 },
    { color: AMBER,     flex: 20 },
    { color: '#8BC34A', flex: 20 },
    { color: '#00E676', flex: 20 },
  ];

  return (
    <View style={gauge.container}>
      <View style={gauge.header}>
        <Text style={gauge.title}>FEAR & GREED INDEX</Text>
        <View style={[gauge.scoreBadge, { backgroundColor: color + '22' }]}>
          <Text style={[gauge.scoreNum, { color }]}>{data.score}</Text>
        </View>
      </View>
      <Text style={[gauge.rating, { color }]}>{fngLabel(data.rating)}</Text>

      <View style={gauge.barWrapper}>
        <View style={gauge.bar}>
          {segments.map((s, i) => (
            <View key={i} style={{ flex: s.flex, backgroundColor: s.color }} />
          ))}
        </View>
        <View style={[gauge.pin, { left: indicatorLeft }]}>
          <View style={[gauge.pinHead, { backgroundColor: color }]} />
        </View>
      </View>

      <View style={gauge.histRow}>
        {[
          { label: 'Prev Close', val: data.previousClose },
          { label: '1 Week',     val: data.previousWeek  },
          { label: '1 Month',    val: data.previousMonth },
          { label: '1 Year',     val: data.previousYear  },
        ].map((h) => (
          <View key={h.label} style={gauge.histItem}>
            <Text style={gauge.histLabel}>{h.label}</Text>
            <Text style={[gauge.histVal, { color: fngColor(h.val) }]}>{h.val}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const gauge = StyleSheet.create({
  container: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title:     { fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1.5 },
  scoreBadge:{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  scoreNum:  { fontSize: 22, fontWeight: '900' },
  rating:    { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  barWrapper:{ position: 'relative', marginBottom: 10 },
  bar:       { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' },
  pin:       { position: 'absolute', top: -4, width: 16, alignItems: 'center' },
  pinHead:   { width: 16, height: 20, borderRadius: 4, opacity: 0.95 },
  histRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  histItem:  { alignItems: 'center' },
  histLabel: { fontSize: 10, color: MUTED, marginBottom: 2 },
  histVal:   { fontSize: 14, fontWeight: '800' },
});

// ── News article card ─────────────────────────────────────────────────────────
const NewsArticleCard = ({ item }: { item: NewsItem }) => {
  const color =
    item.impact === 'positive' ? GREEN :
    item.impact === 'negative' ? RED : MUTED;
  const icon =
    item.impact === 'positive' ? 'arrow.up.circle.fill' :
    item.impact === 'negative' ? 'arrow.down.circle.fill' : 'minus.circle.fill';

  return (
    <Pressable onPress={() => Linking.openURL(item.searchUrl)} style={news.card}>
      <View style={news.top}>
        <View style={[news.themeBadge, { backgroundColor: color + '18' }]}>
          <Text style={[news.theme, { color }]}>{item.theme}</Text>
        </View>
        <Text style={news.meta}>{item.source} · {item.date}</Text>
      </View>
      <Text style={news.headline} numberOfLines={2}>{item.headline}</Text>
      <Text style={news.blurb} numberOfLines={3}>{item.blurb}</Text>
      <View style={news.impactRow}>
        <IconSymbol size={12} name={icon} color={color} />
        <Text style={[news.impactLabel, { color }]}>
          {item.impact.charAt(0).toUpperCase() + item.impact.slice(1)} impact
        </Text>
      </View>
    </Pressable>
  );
};

const news = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  top:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  themeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  theme:      { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  meta:       { fontSize: 10, color: MUTED },
  headline:   { fontSize: 14, fontWeight: '700', color: '#E6EDF3', lineHeight: 20 },
  blurb:      { fontSize: 12, color: MUTED, lineHeight: 18 },
  impactRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  impactLabel:{ fontSize: 11, fontWeight: '600' },
});

// ── Reddit post card ──────────────────────────────────────────────────────────
const RedditCard = ({ post }: { post: RedditPost }) => (
  <Pressable onPress={() => Linking.openURL(post.url)} style={reddit.card}>
    <View style={reddit.top}>
      <Text style={reddit.sub}>r/{post.subreddit}</Text>
      <View style={reddit.scoreRow}>
        <IconSymbol size={11} name="arrow.up" color={AMBER} />
        <Text style={[reddit.metaNum, { color: AMBER }]}>{formatNum(post.score)}</Text>
        <IconSymbol size={11} name="bubble.left" color={MUTED} style={{ marginLeft: 6 }} />
        <Text style={[reddit.metaNum, { color: MUTED }]}>{formatNum(post.numComments)}</Text>
      </View>
    </View>
    <Text style={reddit.title} numberOfLines={3}>{post.title}</Text>
    <Text style={reddit.author}>u/{post.author}</Text>
  </Pressable>
);

const reddit = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 6,
    marginBottom: 8,
  },
  top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sub:      { fontSize: 11, fontWeight: '700', color: AMBER },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaNum:  { fontSize: 11, fontWeight: '700' },
  title:    { fontSize: 14, fontWeight: '600', color: '#E6EDF3', lineHeight: 20 },
  author:   { fontSize: 11, color: MUTED },
});

// ── X Pulse card ──────────────────────────────────────────────────────────────
const XPulseCard = ({ item }: { item: XPulseItem }) => {
  const color =
    item.sentiment === 'bullish' ? GREEN :
    item.sentiment === 'bearish' ? RED : MUTED;
  return (
    <Pressable onPress={() => Linking.openURL(item.searchUrl)} style={xpulse.card}>
      <View style={xpulse.top}>
        <Text style={[xpulse.persona, { color: BLUE }]}>{item.persona}</Text>
        <View style={[xpulse.badge, { backgroundColor: color + '20' }]}>
          <Text style={[xpulse.badgeText, { color }]}>{item.sentiment.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={xpulse.take}>{item.take}</Text>
    </Pressable>
  );
};

const xpulse = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  top:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  persona:   { fontSize: 13, fontWeight: '700' },
  badge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  take:      { fontSize: 14, color: '#C9D1D9', lineHeight: 20 },
});

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skel = ({ w, h, r = 6 }: { w: number | string; h: number; r?: number }) => (
  <View style={{ width: w as any, height: h, borderRadius: r, backgroundColor: CARD, opacity: 0.6 }} />
);

function SkeletonCard({ rows }: { rows: Array<{ w: string; h: number }> }) {
  return (
    <View style={{ backgroundColor: CARD, borderRadius: 12, padding: 14, marginBottom: 8, gap: 8, borderWidth: 1, borderColor: BORDER }}>
      {rows.map((r, i) => <Skel key={i} w={r.w} h={r.h} />)}
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

type Tab = 'news' | 'social';

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SocialScreen() {
  const [tab, setTab] = useState<Tab>('news');

  const [fng,    setFng]    = useState<FearGreedData | null>(null);
  const [posts,  setPosts]  = useState<RedditPost[]>([]);
  const [mNews,  setMNews]  = useState<NewsItem[]>([]);
  const [pulse,  setPulse]  = useState<XPulseItem[]>([]);

  const [loadingNews,   setLoadingNews]   = useState(true);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [newsError,     setNewsError]     = useState<string | null>(null);
  const [socialError,   setSocialError]   = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setLoadingNews(true);
    setNewsError(null);
    try {
      const [f, n] = await Promise.all([
        fetchFearGreed(),
        fetchMarketNews(),
      ]);
      setFng(f);
      setMNews(n);
    } catch (e: any) {
      setNewsError(e?.message ?? 'Failed to load news');
    } finally {
      setLoadingNews(false);
    }
  }, []);

  const loadSocial = useCallback(async () => {
    setLoadingSocial(true);
    setSocialError(null);
    try {
      const [r, p] = await Promise.all([
        fetchRedditPosts(),
        fetchXPulse(),
      ]);
      setPosts(r);
      setPulse(p);
    } catch (e: any) {
      setSocialError(e?.message ?? 'Failed to load social data');
    } finally {
      setLoadingSocial(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
    loadSocial();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <IconSymbol size={20} name="newspaper.fill" color={BLUE} />
        <Text style={styles.headerTitle}>SOCIAL & MARKETS</Text>
      </Animated.View>

      {/* ── Sub-tabs ───────────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setTab('news')}
          style={[styles.tabBtn, tab === 'news' && styles.tabBtnActive]}
        >
          <IconSymbol size={13} name="newspaper" color={tab === 'news' ? BG : MUTED} />
          <Text style={[styles.tabLabel, tab === 'news' && styles.tabLabelActive]}>NEWS</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('social')}
          style={[styles.tabBtn, tab === 'social' && styles.tabBtnActive]}
        >
          <IconSymbol size={13} name="person.2.fill" color={tab === 'social' ? BG : MUTED} />
          <Text style={[styles.tabLabel, tab === 'social' && styles.tabLabelActive]}>SOCIAL</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ══ NEWS TAB ════════════════════════════════════════════════════════ */}
        {tab === 'news' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            {/* Fear & Greed at top of News */}
            {loadingNews ? (
              <View style={[{ backgroundColor: CARD, borderRadius: 16, padding: 18, marginBottom: 16, gap: 10, borderWidth: 1, borderColor: BORDER }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Skel w="45%" h={12} />
                  <Skel w="18%" h={28} r={8} />
                </View>
                <Skel w="35%" h={18} />
                <Skel w="100%" h={12} r={6} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  {[0,1,2,3].map(i => <Skel key={i} w="22%" h={30} r={6} />)}
                </View>
              </View>
            ) : fng ? (
              <FearGreedGauge data={fng} />
            ) : null}

            {/* News error */}
            {newsError && (
              <View style={styles.errorBanner}>
                <IconSymbol size={13} name="exclamationmark.triangle.fill" color={AMBER} />
                <Text style={[styles.errorText, { color: AMBER }]}>{newsError}</Text>
                <Pressable onPress={loadNews} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <IconSymbol size={13} name="newspaper.fill" color={BLUE} />
              <Text style={[styles.sectionTitle, { color: BLUE }]}>TOP MARKET NEWS</Text>
            </View>

            {loadingNews ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonCard key={i} rows={[
                    { w: '30%', h: 10 },
                    { w: '90%', h: 14 },
                    { w: '100%', h: 38 },
                  ]} />
                ))}
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={BLUE} />
                  <Text style={[styles.loadingText, { color: MUTED }]}>Fetching latest news…</Text>
                </View>
              </>
            ) : mNews.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol size={32} name="newspaper" color={MUTED} />
                <Text style={[styles.emptyText, { color: MUTED }]}>No news available</Text>
                <Pressable onPress={loadNews} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Refresh</Text>
                </Pressable>
              </View>
            ) : (
              mNews.map((item, i) => <NewsArticleCard key={i} item={item} />)
            )}
          </Animated.View>
        )}

        {/* ══ SOCIAL TAB ══════════════════════════════════════════════════════ */}
        {tab === 'social' && (
          <Animated.View entering={FadeInDown.duration(300)}>
            {/* Social error */}
            {socialError && (
              <View style={styles.errorBanner}>
                <IconSymbol size={13} name="exclamationmark.triangle.fill" color={AMBER} />
                <Text style={[styles.errorText, { color: AMBER }]}>{socialError}</Text>
                <Pressable onPress={loadSocial} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {/* Reddit */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: AMBER }]}>REDDIT</Text>
              <Text style={[styles.sectionSub, { color: MUTED }]}>r/wallstreetbets · r/investing</Text>
            </View>

            {loadingSocial ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} rows={[
                    { w: '25%', h: 10 },
                    { w: '95%', h: 14 },
                    { w: '70%', h: 14 },
                    { w: '20%', h: 10 },
                  ]} />
                ))}
              </>
            ) : posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: MUTED }]}>No Reddit posts available</Text>
              </View>
            ) : (
              posts.map((p) => <RedditCard key={p.id} post={p} />)
            )}

            {/* X Pulse */}
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={[styles.sectionTitle, { color: PURPLE }]}>X PULSE</Text>
              <Text style={[styles.sectionSub, { color: MUTED }]}>AI-synthesised market sentiment</Text>
            </View>

            {loadingSocial ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} rows={[
                    { w: '30%', h: 12 },
                    { w: '100%', h: 38 },
                  ]} />
                ))}
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={PURPLE} />
                  <Text style={[styles.loadingText, { color: MUTED }]}>Loading social pulse…</Text>
                </View>
              </>
            ) : pulse.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: MUTED }]}>No pulse data available</Text>
              </View>
            ) : (
              pulse.map((item, i) => <XPulseCard key={i} item={item} />)
            )}
          </Animated.View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 14, fontWeight: '900', color: '#E6EDF3', letterSpacing: 2 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9 },
  tabBtnActive:  { backgroundColor: BLUE },
  tabLabel:      { fontSize: 12, fontWeight: '800', color: MUTED, letterSpacing: 1 },
  tabLabelActive:{ color: BG },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 4 },
  sectionTitle:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  sectionSub:    { fontSize: 10, marginLeft: 2 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AMBER + '18',
    borderWidth: 1,
    borderColor: AMBER + '40',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontSize: 12 },
  retryBtn: {
    backgroundColor: AMBER + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryText: { color: AMBER, fontWeight: '700', fontSize: 11 },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyText:  { fontSize: 13 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: { fontSize: 12 },
});
