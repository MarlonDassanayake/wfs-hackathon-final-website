import React, { useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View, Switch } from 'react-native';
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

// Mock contrarian signals — potential shorting opportunities
const CONTRARIAN_ALERTS = [
  {
    id: '1',
    ticker: 'SMCI',
    title: 'Accounting Red Flags + Parabolic Move',
    description: 'Auditor resignation, delayed 10-K filing, while stock rallied 300% on AI narrative. Classic late-cycle crowded trade.',
    crowdedness: 91,
    shortInterest: '12.3%',
    daysToExpiry: 'N/A',
    risk: 'Extreme',
    dataPoints: [
      'Reddit mentions: +450% 30d',
      'Insider sales: $45M in 90 days',
      'Short interest declining into rally',
      'Analyst consensus: 14 buys, 2 sells',
    ],
  },
  {
    id: '2',
    ticker: 'MSTR',
    title: 'Single-Thesis Maximum Leverage Play',
    description: 'Entire investment thesis is BTC proxy. Convertible debt structure creates reflexivity risk on BTC downturn.',
    crowdedness: 93,
    shortInterest: '18.7%',
    daysToExpiry: '~60d convertible',
    risk: 'Extreme',
    dataPoints: [
      'Trading at 2.5x BTC NAV premium',
      'Retail ownership concentration: 68%',
      'Options volume: 4x average',
      'Narrative dominance: "digital gold" thesis',
    ],
  },
  {
    id: '3',
    ticker: 'PLTR',
    title: 'Government Contract Concentration + Retail Hype',
    description: 'Retail traders have created extreme positioning while commercial revenue growth decelerates.',
    crowdedness: 79,
    shortInterest: '5.2%',
    daysToExpiry: 'N/A',
    risk: 'High',
    dataPoints: [
      'Retail ownership: 51% of float',
      'P/S ratio: 22x vs SaaS median 8x',
      'Insider selling pace: accelerating',
      'Reddit sentiment: 89th percentile',
    ],
  },
];

const DATA_SOURCES = [
  { name: 'Yahoo Finance', status: 'connected', type: 'Fundamentals' },
  { name: 'SEC EDGAR', status: 'connected', type: '13F Filings' },
  { name: 'Reddit API', status: 'connected', type: 'Social Sentiment' },
  { name: 'FRED', status: 'connected', type: 'Macro Data' },
  { name: 'Options Flow', status: 'simulated', type: 'Put/Call Data' },
];

export default function ContrarianScreen() {
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [contrariamMode, setContrarianMode] = useState(true);
  const [sentimentAlerts, setSentimentAlerts] = useState(true);
  const [insiderAlerts, setInsiderAlerts] = useState(true);

  const tintColor = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#161B22' }, 'background');
  const cardBorder = useThemeColor({ light: '#E1E4E8', dark: '#30363D' }, 'icon');
  const mutedColor = useThemeColor({ light: '#586069', dark: '#8B949E' }, 'icon');

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#0D1117', dark: '#0D1117' }}
      headerImage={
        <View style={styles.headerContent}>
          <IconSymbol size={80} name="exclamationmark.triangle.fill" color="#FF5252" style={styles.headerIcon} />
          <ThemedText style={styles.headerTitle}>CONTRARIAN MODE</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Find What to Avoid</ThemedText>
        </View>
      }>
      <AnimatedThemedView entering={FadeIn} style={styles.container}>
        {/* Contrarian Mode Toggle */}
        <AnimatedThemedView
          entering={FadeInDown.delay(100).springify()}
          style={[styles.modeCard, { backgroundColor: cardBg, borderColor: contrariamMode ? '#FF5252' : cardBorder }]}
        >
          <View style={styles.modeHeader}>
            <View style={styles.modeInfo}>
              <IconSymbol size={24} name="exclamationmark.triangle.fill" color="#FF5252" />
              <View>
                <ThemedText style={styles.modeTitle}>AI Contrarian Mode</ThemedText>
                <ThemedText style={[styles.modeDesc, { color: mutedColor }]}>
                  Scan for overcrowded trades and narrative-driven risk
                </ThemedText>
              </View>
            </View>
            <Switch
              value={contrariamMode}
              onValueChange={setContrarianMode}
              trackColor={{ false: '#30363D', true: '#FF525240' }}
              thumbColor={contrariamMode ? '#FF5252' : '#8B949E'}
            />
          </View>
        </AnimatedThemedView>

        {/* Alert Settings */}
        <AnimatedThemedView
          entering={FadeInDown.delay(150).springify()}
          style={[styles.settingsCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
        >
          <ThemedText style={styles.sectionTitle}>Alert Filters</ThemedText>
          <View style={styles.settingRow}>
            <View>
              <ThemedText style={styles.settingLabel}>Sentiment/Fundamentals Divergence</ThemedText>
              <ThemedText style={[styles.settingDesc, { color: mutedColor }]}>
                Alert when social hype diverges from earnings
              </ThemedText>
            </View>
            <Switch
              value={sentimentAlerts}
              onValueChange={setSentimentAlerts}
              trackColor={{ false: '#30363D', true: '#00E67640' }}
              thumbColor={sentimentAlerts ? '#00E676' : '#8B949E'}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: cardBorder }]} />
          <View style={styles.settingRow}>
            <View>
              <ThemedText style={styles.settingLabel}>Insider Selling Spikes</ThemedText>
              <ThemedText style={[styles.settingDesc, { color: mutedColor }]}>
                Flag when insiders dump during retail rallies
              </ThemedText>
            </View>
            <Switch
              value={insiderAlerts}
              onValueChange={setInsiderAlerts}
              trackColor={{ false: '#30363D', true: '#00E67640' }}
              thumbColor={insiderAlerts ? '#00E676' : '#8B949E'}
            />
          </View>
        </AnimatedThemedView>

        {/* Contrarian Alerts */}
        <AnimatedThemedView entering={FadeInDown.delay(200).springify()}>
          <ThemedText style={styles.sectionTitle}>Active Contrarian Alerts</ThemedText>
          <ThemedText style={[styles.sectionDesc, { color: mutedColor }]}>
            Potential short candidates — extreme positioning detected
          </ThemedText>

          {CONTRARIAN_ALERTS.map((alert, index) => (
            <AnimatedThemedView
              key={alert.id}
              entering={FadeInDown.delay(250 + index * 80).springify()}
              style={[styles.alertCard, {
                backgroundColor: cardBg,
                borderColor: alert.risk === 'Extreme' ? '#FF5252' : '#FFB74D',
              }]}
            >
              <Pressable onPress={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}>
                <View style={styles.alertHeader}>
                  <View>
                    <View style={styles.alertTickerRow}>
                      <ThemedText style={styles.alertTicker}>{alert.ticker}</ThemedText>
                      <View style={[styles.riskTag, {
                        backgroundColor: alert.risk === 'Extreme' ? '#FF525220' : '#FFB74D20',
                      }]}>
                        <ThemedText style={[styles.riskTagText, {
                          color: alert.risk === 'Extreme' ? '#FF5252' : '#FFB74D',
                        }]}>
                          {alert.risk.toUpperCase()}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.alertTitle}>{alert.title}</ThemedText>
                  </View>
                  <View style={styles.alertScoreBox}>
                    <ThemedText style={[styles.alertScore, { color: '#FF5252' }]}>
                      {alert.crowdedness}
                    </ThemedText>
                    <ThemedText style={[styles.alertScoreLabel, { color: mutedColor }]}>Crowd</ThemedText>
                  </View>
                </View>

                <ThemedText style={[styles.alertDesc, { color: mutedColor }]}>
                  {alert.description}
                </ThemedText>

                {expandedAlert === alert.id && (
                  <AnimatedThemedView entering={FadeIn} style={styles.alertExpanded}>
                    <View style={styles.alertMetricsRow}>
                      <View style={styles.alertMetric}>
                        <ThemedText style={[styles.alertMetricLabel, { color: mutedColor }]}>Short Interest</ThemedText>
                        <ThemedText style={styles.alertMetricValue}>{alert.shortInterest}</ThemedText>
                      </View>
                      <View style={styles.alertMetric}>
                        <ThemedText style={[styles.alertMetricLabel, { color: mutedColor }]}>Catalyst</ThemedText>
                        <ThemedText style={styles.alertMetricValue}>{alert.daysToExpiry}</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={[styles.dataPointsTitle, { color: mutedColor }]}>Key Data Points:</ThemedText>
                    {alert.dataPoints.map((dp, i) => (
                      <View key={i} style={styles.dataPointRow}>
                        <ThemedText style={[styles.bullet, { color: '#FF5252' }]}>•</ThemedText>
                        <ThemedText style={styles.dataPointText}>{dp}</ThemedText>
                      </View>
                    ))}
                  </AnimatedThemedView>
                )}

                <ThemedText style={[styles.expandHint, { color: tintColor }]}>
                  {expandedAlert === alert.id ? 'Collapse' : 'Tap to expand'}
                </ThemedText>
              </Pressable>
            </AnimatedThemedView>
          ))}
        </AnimatedThemedView>

        {/* Data Sources */}
        <AnimatedThemedView entering={FadeInDown.delay(500).springify()}>
          <ThemedText style={[styles.sectionTitle, { marginTop: 8 }]}>Data Sources</ThemedText>
          <View style={[styles.sourcesCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {DATA_SOURCES.map((source, i) => (
              <View key={source.name}>
                <View style={styles.sourceRow}>
                  <View>
                    <ThemedText style={styles.sourceName}>{source.name}</ThemedText>
                    <ThemedText style={[styles.sourceType, { color: mutedColor }]}>{source.type}</ThemedText>
                  </View>
                  <View style={[styles.statusDot, {
                    backgroundColor: source.status === 'connected' ? '#00E676' : '#FFB74D'
                  }]} />
                </View>
                {i < DATA_SOURCES.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: cardBorder }]} />
                )}
              </View>
            ))}
          </View>
        </AnimatedThemedView>

        {/* Disclaimer */}
        <AnimatedThemedView
          entering={FadeInDown.delay(600).springify()}
          style={[styles.disclaimer, { borderColor: cardBorder }]}
        >
          <ThemedText style={[styles.disclaimerText, { color: mutedColor }]}>
            This tool identifies potential risks based on data analysis. It does not constitute financial advice. Always do your own research before making investment decisions.
          </ThemedText>
        </AnimatedThemedView>
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
    fontSize: 22,
    fontWeight: '900',
    color: '#FF5252',
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8B949E',
    letterSpacing: 1,
    marginTop: 4,
  },
  modeCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  modeTitle: { fontSize: 16, fontWeight: '800' },
  modeDesc: { fontSize: 12, marginTop: 2 },
  settingsCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 12, marginBottom: 16 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingDesc: { fontSize: 11, marginTop: 2, maxWidth: width * 0.6 },
  divider: { height: 1, marginVertical: 8 },
  alertCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertTickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  alertTicker: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  riskTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  riskTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  alertTitle: { fontSize: 13, fontWeight: '600' },
  alertScoreBox: { alignItems: 'center' },
  alertScore: { fontSize: 28, fontWeight: '900' },
  alertScoreLabel: { fontSize: 10 },
  alertDesc: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  alertExpanded: { marginTop: 8 },
  alertMetricsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  alertMetric: {},
  alertMetricLabel: { fontSize: 10, fontWeight: '600' },
  alertMetricValue: { fontSize: 16, fontWeight: '800' },
  dataPointsTitle: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  dataPointRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  bullet: { fontSize: 14, fontWeight: '800' },
  dataPointText: { fontSize: 12, flex: 1, lineHeight: 18 },
  expandHint: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  sourcesCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  sourceName: { fontSize: 14, fontWeight: '600' },
  sourceType: { fontSize: 11, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  disclaimer: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 32,
  },
  disclaimerText: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
