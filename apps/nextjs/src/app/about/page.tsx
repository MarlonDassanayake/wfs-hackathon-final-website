'use client';
import { Activity, AlertTriangle, Shield, DollarSign, TrendingUp, Globe, Search, Newspaper, Briefcase } from 'lucide-react';

const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';
const RED    = '#FF5252';

const philosophy = [
  {
    Icon: Activity,
    color: BLUE,
    title: 'Sentiment Intelligence',
    body: "ALETHEIA's edge. Track narrative vs fundamentals divergence. Elevated hype with deteriorating fundamentals = short signal. Ignored quality with low sentiment = long signal.",
  },
  {
    Icon: AlertTriangle,
    color: RED,
    title: 'Extreme Selectivity',
    body: 'Say "no" to almost everything. The universe of truly exceptional companies is small. Only the highest-conviction ideas deserve attention.',
  },
  {
    Icon: Shield,
    color: GREEN,
    title: 'Moat-First',
    body: 'Only favour companies with durable competitive advantages — network effects, brand power, scale economies, high switching costs. A moat must scale and self-perpetuate.',
  },
  {
    Icon: DollarSign,
    color: AMBER,
    title: 'Barbell Positioning',
    body: 'Downside protection first; upside takes care of itself. A great company at 60× P/E can still destroy capital through multiple contraction.',
  },
  {
    Icon: TrendingUp,
    color: BLUE,
    title: 'Contrarian Edge',
    body: 'Markets systematically overprice popular narratives and underprice ignored quality. You make money when you are right AND the market is wrong.',
  },
  {
    Icon: Globe,
    color: GREEN,
    title: 'Macro Context',
    body: 'S&P 500 trades at ~22× forward P/E — the widest gap above the historical median since the dotcom bubble. Correction risk is elevated. Downside protection always comes first.',
  },
];

const features = [
  { Icon: Search,    color: GREEN, label: 'Stock Analysis',   desc: 'Deep AI analysis with short & long thesis scoring' },
  { Icon: Activity,  color: BLUE,  label: 'Sentiment Intel',  desc: 'Narrative vs fundamentals divergence — the ALETHEIA edge' },
  { Icon: Briefcase, color: AMBER, label: 'Portfolio Hedge',  desc: 'Factor-based risk assessment, beta analysis, and hedge recommendations' },
  { Icon: Newspaper, color: RED,   label: 'Social & Markets', desc: 'Reddit posts, X pulse, market news with impact ratings' },
];

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Brand header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center py-8 gap-3 mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ALETHEIA" width={80} height={80} style={{ borderRadius: '50%' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', letterSpacing: 4, marginTop: 8 }}>ALETHEIA</h1>
        <p style={{ fontSize: 13, color: MUTED, letterSpacing: 2, fontWeight: 600 }}>Pocket-Sized Hedge Fund</p>
        <div style={{ width: 40, height: 2, backgroundColor: BORDER, borderRadius: 1, margin: '8px 0' }} />
        <p className="text-center" style={{ fontSize: 14, color: '#C9D1D9', lineHeight: 1.7, maxWidth: 600 }}>
          ALETHEIA (Greek: truth/disclosure) is an AI-powered investment intelligence platform
          built for contrarian investors. Aletheia brings top hedge-fund level qualitative research, portfolio risk assessment and personalised hedge recommendations to retail investors like never before.
          Aletheia is built to help you maximise your equity knowledge through sentiment intelligence, moat analysis,
          and rigorous fundamental scrutiny, just like they do.
        </p>
      </div>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: 2, marginBottom: 12 }}>WHAT ALETHEIA DOES</p>
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div key={f.label} className="rounded-2xl p-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <f.Icon size={22} color={f.color} />
              <p style={{ fontSize: 13, fontWeight: 800, color: f.color, letterSpacing: 0.5, marginTop: 8, marginBottom: 4 }}>{f.label}</p>
              <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Philosophy ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: 2, marginBottom: 12 }}>INVESTMENT PHILOSOPHY</p>
        {philosophy.map((p) => (
          <div key={p.title} className="flex gap-4 rounded-2xl p-4 mb-2" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, backgroundColor: p.color + '18' }}>
              <p.Icon size={18} color={p.color} />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 13, fontWeight: 800, color: p.color, marginBottom: 4 }}>{p.title}</p>
              <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Scoring guide ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 10, fontWeight: 900, color: MUTED, letterSpacing: 2, marginBottom: 12 }}>SCORING GRADES</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            { grade: 'AAA', color: GREEN }, { grade: 'AA', color: GREEN }, { grade: 'A', color: GREEN },
            { grade: 'BBB', color: AMBER }, { grade: 'BB', color: AMBER }, { grade: 'B', color: AMBER },
            { grade: 'CCC', color: RED   }, { grade: 'CC', color: RED   }, { grade: 'C', color: RED   },
          ].map((g) => (
            <span key={g.grade} className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: g.color + '18', fontSize: 13, fontWeight: 800, color: g.color }}>
              {g.grade}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: MUTED, lineHeight: 1.5 }}>
          Scores from 0–100. AAA (90–100) indicates highest conviction. C (0–19) indicates extreme risk or weakness.
        </p>
      </div>

      {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${AMBER}40` }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} color={AMBER} />
          <p style={{ fontSize: 10, fontWeight: 900, color: AMBER, letterSpacing: 2 }}>DISCLAIMER</p>
        </div>
        <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          Always conduct your own due diligence before making investment decisions. Past analysis does not guarantee future performance.
        </p>
      </div>

      {/* ── Version ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center mt-4 pb-6">
        <p style={{ fontSize: 11, color: MUTED, textAlign: 'center' }}>ALETHEIA · Built at WFS Hackathon 2026</p>
      </div>
    </div>
  );
}
