import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';

const { width } = Dimensions.get('window');
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mock scanner data — overcrowded trades detected
const SCANNER_RESULTS = [
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corp',
    crowdedness: 87,
    sentiment: 92,
    fundamental: 61,
    signal: 'Extreme social bullishness + insider selling divergence',
    risk: 'high',
  },
  {
    ticker: 'SMCI',
    name: 'Super Micro Computer',
    crowdedness: 91,
    sentiment: 88,
    fundamental: 35,
    signal: 'Parabolic price action with collapsing fundamentals',
    risk: 'high',
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc',
    crowdedness: 74,
    sentiment: 85,
    fundamental: 42,
    signal: 'Reddit sentiment at 6-month high vs declining deliveries',
    risk: 'elevated',
  },
  {
    ticker: 'PLTR',
    name: 'Palantir Technologies',
    crowdedness: 79,
    sentiment: 81,
    fundamental: 48,
    signal: 'Retail concentration extreme — institutional hedging detected',
    risk: 'elevated',
  },
  {
    ticker: 'MSTR',
    name: 'MicroStrategy',
    crowdedness: 93,
    sentiment: 90,
    fundamental: 22,
    signal: 'Single-thesis trade (BTC proxy) with max leverage',
    risk: 'high',
  },
  {
    ticker: 'ARM',
    name: 'ARM Holdings',
    crowdedness: 68,
    sentiment: 72,
    fundamental: 55,
    signal: 'IPO hype cycle nearing exhaustion — lock-up approaching',
    risk: 'moderate',
  },
];

const SCAN_CATEGORIES = [
  { id: 'crowded', label: 'Most Crowded', icon: 'person.3.fill' as const },
  { id: 'divergent', label: 'Sentiment Gap', icon: 'arrow.left.arrow.right' as const },
  { id: 'insider', label: 'Insider Selling', icon: 'person.badge.minus' as const },
  { id: 'narrative', label: 'Narrative Risk', icon: 'text.bubble.fill' as const },
];

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const colorMap: Record<string, string> = {
    high: '#FF5252',
    elevated: '#FFB74D',
    moderate: '#8B949E',
    low: '#00E676',
  };
  const color = colorMap[risk] || '#8B949E';

  return (
    <View style={[styles.riskBadge, { backgroundColor: color + '20' }]}>
      <ThemedText style={[styles.riskText, { color }]}>
        {risk.toUpperCase()}
      </ThemedText>
    </View>
  );
};

const ScanResultCard: React.FC<{
  item: (typeof SCANNER_RESULTS)[number];
  index: number;
  cardBg: string;
  cardBorder: string;
  mutedColor: string;
}> = ({ item, index, cardBg, cardBorder, mutedColor }) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.97); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <AnimatedThemedView
        entering={FadeInDown.delay(200 + index * 80).springify()}
        style={[styles.scanCard, { backgroundColor: cardBg, borderColor: cardBorder }, animStyle]}
      >
        <View style={styles.scanCardHeader}>
          <View>
            <ThemedText style={styles.scanTicker}>{item.ticker}</ThemedText>
            <ThemedText style={[styles.scanName, { color: mutedColor }]}>{item.name}</ThemedText>
          </View>
          <View style={styles.scanScoreCol}>
            <ThemedText style={[styles.scanScore, {
              color: item.crowdedness >= 80 ? '#FF5252' : item.crowdedness >= 60 ? '#FFB74D' : '#00E676'
            }]}>
              {item.crowdedness}
            </ThemedText>
            <ThemedText style={[styles.scanScoreLabel, { color: mutedColor }]}>Crowd</ThemedText>
          </View>
        </View>

        <View style={styles.scanMetrics}>
          <View style={styles.scanMetric}>
            <ThemedText style={[styles.scanMetricVal, { color: item.sentiment > 75 ? '#FF5252' : '#00E676' }]}>
              {item.sentiment}%
            </ThemedText>
            <ThemedText style={[styles.scanMetricLabel, { color: mutedColor }]}>Sentiment</ThemedText>
          </View>
          <View style={styles.scanMetric}>
            <ThemedText style={[styles.scanMetricVal, { color: '#00E676' }]}>
              {item.fundamental}%
            </ThemedText>
            <ThemedText style={[styles.scanMetricLabel, { color: mutedColor }]}>Fundamental</ThemedText>
          </View>
          <RiskBadge risk={item.risk} />
        </View>

        <View style={[styles.signalBar, { borderColor: cardBorder }]}>
          <IconSymbol size={14} name="exclamationmark.triangle.fill" color="#FFB74D" />
          <ThemedText style={[styles.signalText, { color: mutedColor }]}>{item.signal}</ThemedText>
        </View>
      </AnimatedThemedView>
    </AnimatedPressable>
  );
};

export default function ScannerScreen() {
  const [activeCategory, setActiveCategory] = useState('crowded');
  const [searchQuery, setSearchQuery] = useState('');

  const tintColor = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#161B22' }, 'background');
  const cardBorder = useThemeColor({ light: '#E1E4E8', dark: '#30363D' }, 'icon');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({ light: '#586069', dark: '#8B949E' }, 'icon');

  const filteredResults = useMemo(() => {
    let results = [...SCANNER_RESULTS];
    if (searchQuery) {
      results = results.filter(r =>
        r.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Sort by crowdedness score
    results.sort((a, b) => b.crowdedness - a.crowdedness);
    return results;
  }, [searchQuery, activeCategory]);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#0D1117', dark: '#0D1117' }}
      headerImage={
        <View style={styles.headerContent}>
          <IconSymbol size={80} name="magnifyingglass" color="#00E676" style={styles.headerIcon} />
          <ThemedText style={styles.headerTitle}>MARKET SCANNER</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Detect Overcrowded Trades</ThemedText>
        </View>
      }>
      <AnimatedThemedView entering={FadeIn} style={styles.container}>
        {/* Search */}
        <AnimatedThemedView entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.searchBox, { borderColor: cardBorder, backgroundColor: cardBg }]}>
            <IconSymbol size={18} name="magnifyingglass" color={mutedColor} />
            <TextInput
              placeholder="Filter tickers..."
              placeholderTextColor={mutedColor}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: textColor }]}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </AnimatedThemedView>

        {/* Category Chips */}
        <AnimatedThemedView entering={FadeInDown.delay(150).springify()} style={styles.chipRow}>
          {SCAN_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: activeCategory === cat.id ? tintColor + '20' : cardBg,
                  borderColor: activeCategory === cat.id ? tintColor : cardBorder,
                },
              ]}
            >
              <IconSymbol
                size={14}
                name={cat.icon}
                color={activeCategory === cat.id ? tintColor : mutedColor}
              />
              <ThemedText
                style={[
                  styles.chipText,
                  { color: activeCategory === cat.id ? tintColor : mutedColor },
                ]}
              >
                {cat.label}
              </ThemedText>
            </Pressable>
          ))}
        </AnimatedThemedView>

        {/* Results Count */}
        <ThemedText style={[styles.resultsCount, { color: mutedColor }]}>
          {filteredResults.length} overcrowded trades detected
        </ThemedText>

        {/* Scan Results */}
        {filteredResults.map((item, index) => (
          <ScanResultCard
            key={item.ticker}
            item={item}
            index={index}
            cardBg={cardBg}
            cardBorder={cardBorder}
            mutedColor={mutedColor}
          />
        ))}

        {filteredResults.length === 0 && (
          <AnimatedThemedView entering={FadeIn} style={styles.emptyState}>
            <IconSymbol size={48} name="magnifyingglass" color={mutedColor} />
            <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
              No matching tickers found
            </ThemedText>
          </AnimatedThemedView>
        )}
      </AnimatedThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 4 },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  headerIcon: { marginBottom: 8 },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00E676',
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8B949E',
    letterSpacing: 1,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  resultsCount: { fontSize: 12, marginBottom: 12, fontWeight: '600' },
  scanCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  scanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scanTicker: { fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  scanName: { fontSize: 12, marginTop: 2 },
  scanScoreCol: { alignItems: 'center' },
  scanScore: { fontSize: 28, fontWeight: '900' },
  scanScoreLabel: { fontSize: 10, fontWeight: '600' },
  scanMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  scanMetric: { alignItems: 'center' },
  scanMetricVal: { fontSize: 16, fontWeight: '800' },
  scanMetricLabel: { fontSize: 10, marginTop: 2 },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  riskText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  signalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  signalText: { fontSize: 12, flex: 1, lineHeight: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14 },
});
