import { IconSymbol } from '@/components/ui/IconSymbol';
import { Image } from 'expo-image';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';
const RED    = '#FF5252';

const philosophy = [
  {
    icon: 'waveform' as const,
    color: BLUE,
    title: 'Sentiment Intelligence',
    body: 'ALETHEIA\'s edge. Track narrative vs fundamentals divergence. Elevated hype with deteriorating fundamentals = short signal. Ignored quality with low sentiment = long signal.',
  },
  {
    icon: 'exclamationmark.triangle.fill' as const,
    color: RED,
    title: 'Extreme Selectivity',
    body: 'Say "no" to almost everything. The universe of truly exceptional companies is small. Only the highest-conviction ideas deserve attention.',
  },
  {
    icon: 'shield.fill' as const,
    color: GREEN,
    title: 'Moat-First',
    body: 'Only favour companies with durable competitive advantages — network effects, brand power, scale economies, high switching costs. A moat must scale and self-perpetuate.',
  },
  {
    icon: 'dollarsign.circle.fill' as const,
    color: AMBER,
    title: 'Never Overpay',
    body: 'Downside protection first; upside takes care of itself. A great company at 60× P/E can still destroy capital through multiple contraction.',
  },
  {
    icon: 'chart.line.uptrend.xyaxis' as const,
    color: BLUE,
    title: 'Contrarian Edge',
    body: 'Markets systematically overprice popular narratives and underprice ignored quality. You make money when you are right AND the market is wrong.',
  },
  {
    icon: 'globe' as const,
    color: GREEN,
    title: 'Macro Context',
    body: 'S&P 500 trades at ~22× forward P/E — the widest gap above the historical median since the dotcom bubble. Correction risk is elevated. Downside protection always comes first.',
  },
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Brand header ───────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.brandBlock}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={{ width: 72, height: 72, borderRadius: 100 }}
            contentFit="contain"
          />
          <Text style={styles.appName}>ALETHEIA</Text>
          <Text style={styles.tagline}>Personal Hedge Fund</Text>
          <View style={styles.divider} />
          <Text style={styles.description}>
            ALETHEIA (Greek: truth/disclosure) is an AI-powered investment intelligence platform
            built for contrarian investors. It reveals the gap between narrative and reality —
            helping you find what the crowd misses through sentiment intelligence, moat analysis,
            and rigorous fundamental scrutiny.
          </Text>
        </Animated.View>

        {/* ── Features ───────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>WHAT ALETHEIA DOES</Text>
          <View style={styles.featuresGrid}>
            {[
              { icon: 'magnifyingglass' as const,    color: GREEN,  label: 'Stock Analysis',    desc: 'Deep AI analysis with short & long thesis scoring' },
              { icon: 'waveform'        as const,    color: BLUE,   label: 'Sentiment Intel',   desc: 'Narrative vs fundamentals divergence — the ALETHEIA edge' },
              { icon: 'briefcase.fill'  as const,    color: AMBER,  label: 'Portfolio Hedge',   desc: 'Factor-based risk assessment, beta analysis, and hedge recommendations' },
              { icon: 'newspaper.fill'  as const,    color: RED,    label: 'Social & Markets',  desc: 'Reddit posts, X pulse, market news with impact ratings' },
            ].map((f) => (
              <View key={f.label} style={styles.featureCard}>
                <IconSymbol size={22} name={f.icon} color={f.color} />
                <Text style={[styles.featureLabel, { color: f.color }]}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── Philosophy ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <Text style={styles.sectionTitle}>INVESTMENT PHILOSOPHY</Text>
          {philosophy.map((p) => (
            <View key={p.title} style={styles.philCard}>
              <View style={[styles.philIcon, { backgroundColor: p.color + '18' }]}>
                <IconSymbol size={18} name={p.icon} color={p.color} />
              </View>
              <View style={styles.philText}>
                <Text style={[styles.philTitle, { color: p.color }]}>{p.title}</Text>
                <Text style={styles.philBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* ── Scoring guide ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.card}>
          <Text style={styles.sectionTitle}>SCORING GRADES</Text>
          <View style={styles.gradesRow}>
            {[
              { grade: 'AAA', color: GREEN },
              { grade: 'AA',  color: GREEN },
              { grade: 'A',   color: GREEN },
              { grade: 'BBB', color: AMBER },
              { grade: 'BB',  color: AMBER },
              { grade: 'B',   color: AMBER },
              { grade: 'CCC', color: RED },
              { grade: 'CC',  color: RED },
              { grade: 'C',   color: RED },
            ].map((g) => (
              <View key={g.grade} style={[styles.gradePill, { backgroundColor: g.color + '18' }]}>
                <Text style={[styles.gradePillText, { color: g.color }]}>{g.grade}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.gradeNote}>
            Scores from 0–100. AAA (90–100) indicates highest conviction. C (0–19) indicates extreme risk or weakness.
          </Text>
        </Animated.View>

        {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(600).springify()} style={[styles.card, { borderColor: AMBER + '40' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <IconSymbol size={14} name="exclamationmark.triangle.fill" color={AMBER} />
            <Text style={[styles.sectionTitle, { color: AMBER, marginBottom: 0 }]}>DISCLAIMER</Text>
          </View>
          <Text style={styles.disclaimer}>
            Always conduct your own
            due diligence before making investment decisions. Past analysis does not guarantee future performance.
          </Text>
        </Animated.View>

        {/* ── Version ────────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(650).springify()} style={styles.versionRow}>
          <Text style={styles.versionText}>ALETHEIA v1.0  ·  Built at WFS Hackathon 2026</Text>
          <Text style={[styles.versionText, { color: MUTED + '80', marginTop: 4 }]}>
          </Text>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 48 },

  // Brand
  brandBlock: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
    marginBottom: 8,
  },
  appName:     { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: 4, marginTop: 8},
  tagline:     { fontSize: 13, color: MUTED, letterSpacing: 2, fontWeight: '600' },
  divider:     { width: 40, height: 2, backgroundColor: BORDER, borderRadius: 1, marginVertical: 12 },
  description: { fontSize: 14, color: '#C9D1D9', lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },

  sectionTitle: { fontSize: 10, fontWeight: '900', color: MUTED, letterSpacing: 2, marginBottom: 12 },
  sectionTitlemore: { fontSize: 30, fontWeight: '900', color: MUTED, letterSpacing: 2, marginBottom: 12 },

  // Features
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  featureCard: {
    width: '47.5%',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  featureLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  featureDesc:  { fontSize: 11, color: MUTED, lineHeight: 16 },

  // Philosophy
  philCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  philIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  philText:  { flex: 1, gap: 4 },
  philTitle: { fontSize: 13, fontWeight: '800' },
  philBody:  { fontSize: 12, color: MUTED, lineHeight: 18 },

  // Grades
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  gradesRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  gradePill:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  gradePillText: { fontSize: 13, fontWeight: '800' },
  gradeNote:     { fontSize: 11, color: MUTED, lineHeight: 16 },

  // Disclaimer
  disclaimer: { fontSize: 12, color: MUTED, lineHeight: 18 },

  // Version
  versionRow: { alignItems: 'center', marginTop: 8, paddingBottom: 8 },
  versionText: { fontSize: 11, color: MUTED, textAlign: 'center' },
});
