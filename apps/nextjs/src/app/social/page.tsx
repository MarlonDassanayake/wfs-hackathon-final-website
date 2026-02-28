'use client';
import { useState, useEffect, useCallback } from 'react';
import { Newspaper, Users, ArrowUp, ArrowDown, MessageCircle, AlertTriangle, ExternalLink, Minus, RefreshCw } from 'lucide-react';
import {
  type FearGreedData, type NewsItem, type RedditPost, type XPulseItem,
} from '@/services/social';
import { fetchFearGreed, fetchMarketNews, fetchRedditPosts, fetchXPulse } from '@/services/clientApi';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';
const PURPLE = '#B388FF';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fngColor(score: number): string {
  if (score <= 20) return '#FF3B3B';
  if (score <= 40) return '#FF8C00';
  if (score <= 60) return AMBER;
  if (score <= 80) return '#8BC34A';
  return '#00E676';
}
function fngLabel(rating: string): string {
  return (rating ?? '').split(/[_ ]/)
    .map((w) => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '')
    .join(' ');
}
function formatNum(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

// ── Fear & Greed Gauge ────────────────────────────────────────────────────────
function FearGreedGauge({ data }: { data: FearGreedData }) {
  const color = fngColor(data.score);
  const pct   = data.score / 100;
  const segments = [
    { color: '#FF3B3B', flex: 20 },
    { color: '#FF8C00', flex: 20 },
    { color: AMBER,     flex: 20 },
    { color: '#8BC34A', flex: 20 },
    { color: '#00E676', flex: 20 },
  ];

  return (
    <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 11, fontWeight: 800, color: MUTED, letterSpacing: 1.5 }}>FEAR & GREED INDEX</span>
        <span className="px-3 py-1 rounded-lg" style={{ backgroundColor: color + '22', fontSize: 22, fontWeight: 900, color }}>
          {data.score}
        </span>
      </div>
      <p style={{ fontSize: 17, fontWeight: 700, color, marginBottom: 14 }}>{fngLabel(data.rating)}</p>

      {/* Bar */}
      <div className="relative mb-3">
        <div className="flex rounded-full overflow-hidden" style={{ height: 12 }}>
          {segments.map((s, i) => (
            <div key={i} style={{ flex: s.flex, backgroundColor: s.color }} />
          ))}
        </div>
        {/* Indicator */}
        <div
          className="absolute top-0"
          style={{
            left: `calc(${pct * 100}% - 8px)`,
            width: 16,
            height: 20,
            backgroundColor: color,
            borderRadius: 4,
            opacity: 0.95,
            top: -4,
          }}
        />
      </div>

      {/* History */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { label: 'Prev Close', val: data.previousClose },
          { label: '1 Week',     val: data.previousWeek  },
          { label: '1 Month',    val: data.previousMonth },
          { label: '1 Year',     val: data.previousYear  },
        ].map((h) => (
          <div key={h.label} className="flex flex-col items-center">
            <span style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{h.label}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: fngColor(h.val) }}>{h.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── News card ─────────────────────────────────────────────────────────────────
function NewsArticleCard({ item }: { item: NewsItem }) {
  const color = item.impact === 'positive' ? GREEN : item.impact === 'negative' ? RED : MUTED;
  const Icon  = item.impact === 'positive' ? ArrowUp : item.impact === 'negative' ? ArrowDown : Minus;
  return (
    <a
      href={item.searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-4 mb-2 hover:opacity-90 transition-all"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, textDecoration: 'none', color: 'inherit' }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: color + '18', fontSize: 10, fontWeight: 900, color, letterSpacing: 1 }}>
          {item.theme}
        </span>
        <span style={{ fontSize: 10, color: MUTED }}>{item.source} · {item.date}</span>
      </div>
      <p className="font-bold mb-1" style={{ fontSize: 14, color: '#E6EDF3', lineHeight: 1.4 }}>{item.headline}</p>
      <p className="text-xs mb-2" style={{ color: MUTED, lineHeight: 1.6 }}>{item.blurb}</p>
      <div className="flex items-center gap-1">
        <Icon size={12} color={color} />
        <span style={{ fontSize: 11, fontWeight: 600, color }}>
          {item.impact.charAt(0).toUpperCase() + item.impact.slice(1)} impact
        </span>
      </div>
    </a>
  );
}

// ── Reddit card ───────────────────────────────────────────────────────────────
function RedditCard({ post }: { post: RedditPost }) {
  return (
    <a
      href={post.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-4 mb-2 hover:opacity-90 transition-all"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, textDecoration: 'none', color: 'inherit' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 11, fontWeight: 700, color: AMBER }}>r/{post.subreddit}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <ArrowUp size={11} color={AMBER} />
            <span style={{ fontSize: 11, fontWeight: 700, color: AMBER }}>{formatNum(post.score)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={11} color={MUTED} />
            <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>{formatNum(post.numComments)}</span>
          </div>
        </div>
      </div>
      <p className="font-semibold mb-1" style={{ fontSize: 14, color: '#E6EDF3', lineHeight: 1.4 }}>{post.title}</p>
      <span style={{ fontSize: 11, color: MUTED }}>u/{post.author}</span>
    </a>
  );
}

// ── X Pulse card ──────────────────────────────────────────────────────────────
function XPulseCard({ item }: { item: XPulseItem }) {
  const color = item.sentiment === 'bullish' ? GREEN : item.sentiment === 'bearish' ? RED : MUTED;
  return (
    <a
      href={item.searchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-4 mb-2 hover:opacity-90 transition-all"
      style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, textDecoration: 'none', color: 'inherit' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 13, fontWeight: 700, color: BLUE }}>{item.persona}</span>
        <span className="px-2 py-0.5 rounded-md" style={{ backgroundColor: color + '20', fontSize: 10, fontWeight: 800, color, letterSpacing: 0.5 }}>
          {item.sentiment.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: 14, color: '#C9D1D9', lineHeight: 1.5 }}>{item.take}</p>
    </a>
  );
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────
function SkeletonCard({ rows }: { rows: Array<{ w: string; h: number }> }) {
  return (
    <div className="rounded-xl p-4 mb-2" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="animate-pulse mb-2"
          style={{ width: r.w, height: r.h, borderRadius: 4, backgroundColor: BORDER, opacity: 0.7 }}
        />
      ))}
    </div>
  );
}

type Tab = 'news' | 'social';

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SocialPage() {
  const [tab, setTab] = useState<Tab>('news');

  const [fng,   setFng]   = useState<FearGreedData | null>(null);
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [mNews, setMNews] = useState<NewsItem[]>([]);
  const [pulse, setPulse] = useState<XPulseItem[]>([]);

  const [loadingNews,   setLoadingNews]   = useState(true);
  const [loadingSocial, setLoadingSocial] = useState(true);
  const [newsError,     setNewsError]     = useState<string | null>(null);
  const [socialError,   setSocialError]   = useState<string | null>(null);

  const loadNews = useCallback(async () => {
    setLoadingNews(true);
    setNewsError(null);
    try {
      const [f, n] = await Promise.all([fetchFearGreed(), fetchMarketNews()]);
      setFng(f);
      setMNews(n);
    } catch (e: unknown) {
      setNewsError(e instanceof Error ? e.message : 'Failed to load news');
    } finally {
      setLoadingNews(false);
    }
  }, []);

  const loadSocial = useCallback(async () => {
    setLoadingSocial(true);
    setSocialError(null);
    try {
      const [r, p] = await Promise.all([fetchRedditPosts(), fetchXPulse()]);
      setPosts(r);
      setPulse(p);
    } catch (e: unknown) {
      setSocialError(e instanceof Error ? e.message : 'Failed to load social data');
    } finally {
      setLoadingSocial(false);
    }
  }, []);

  useEffect(() => { loadNews(); loadSocial(); }, [loadNews, loadSocial]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <Newspaper size={22} color={BLUE} />
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#E6EDF3', letterSpacing: 2 }}>SOCIAL & MARKETS</h1>
      </div>

      {/* ── Sub-tabs ───────────────────────────────────────────────────────── */}
      <div
        className="flex rounded-xl p-1 mb-5"
        style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}
      >
        {[
          { id: 'news',   label: 'NEWS',   Icon: Newspaper },
          { id: 'social', label: 'SOCIAL', Icon: Users },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 transition-all"
            style={{
              backgroundColor: tab === id ? BLUE : 'transparent',
              color: tab === id ? BG : MUTED,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 1,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ══ NEWS TAB ════════════════════════════════════════════════════════ */}
      {tab === 'news' && (
        <div className="animate-fade-in">
          {loadingNews ? (
            <div className="rounded-2xl p-5 mb-4 animate-pulse" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
              <div className="flex justify-between mb-3">
                <div style={{ width: '45%', height: 12, borderRadius: 4, backgroundColor: BORDER }} />
                <div style={{ width: '18%', height: 28, borderRadius: 8, backgroundColor: BORDER }} />
              </div>
              <div style={{ width: '35%', height: 18, borderRadius: 4, backgroundColor: BORDER, marginBottom: 12 }} />
              <div style={{ width: '100%', height: 12, borderRadius: 6, backgroundColor: BORDER }} />
            </div>
          ) : fng ? <FearGreedGauge data={fng} /> : null}

          {newsError && (
            <div className="flex items-center gap-2 rounded-xl p-3 mb-4" style={{ backgroundColor: AMBER + '18', border: `1px solid ${AMBER}40` }}>
              <AlertTriangle size={13} color={AMBER} />
              <span className="flex-1 text-xs" style={{ color: AMBER }}>{newsError}</span>
              <button onClick={loadNews} className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: AMBER + '30', color: AMBER }}>Retry</button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <Newspaper size={13} color={BLUE} />
            <span style={{ fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: 1.5 }}>TOP MARKET NEWS</span>
          </div>

          {loadingNews
            ? Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} rows={[{ w: '30%', h: 10 }, { w: '90%', h: 14 }, { w: '100%', h: 38 }]} />
              ))
            : mNews.length === 0
              ? <p className="text-center py-8" style={{ color: MUTED }}>No news available</p>
              : mNews.map((item, i) => <NewsArticleCard key={i} item={item} />)
          }

          {loadingNews && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: BLUE, borderTopColor: 'transparent' }} />
              <span style={{ fontSize: 12, color: MUTED }}>Fetching latest news…</span>
            </div>
          )}
        </div>
      )}

      {/* ══ SOCIAL TAB ══════════════════════════════════════════════════════ */}
      {tab === 'social' && (
        <div className="animate-fade-in">
          {socialError && (
            <div className="flex items-center gap-2 rounded-xl p-3 mb-4" style={{ backgroundColor: AMBER + '18', border: `1px solid ${AMBER}40` }}>
              <AlertTriangle size={13} color={AMBER} />
              <span className="flex-1 text-xs" style={{ color: AMBER }}>{socialError}</span>
              <button onClick={loadSocial} className="px-2 py-1 rounded text-xs font-bold" style={{ backgroundColor: AMBER + '30', color: AMBER }}>Retry</button>
            </div>
          )}

          {/* Reddit */}
          <div className="flex items-center gap-2 mb-3">
            <span style={{ fontSize: 11, fontWeight: 800, color: AMBER, letterSpacing: 1.5 }}>REDDIT</span>
            <span style={{ fontSize: 10, color: MUTED }}>r/wallstreetbets · r/investing</span>
          </div>

          {loadingSocial
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} rows={[{ w: '25%', h: 10 }, { w: '95%', h: 14 }, { w: '70%', h: 14 }, { w: '20%', h: 10 }]} />
              ))
            : posts.length === 0
              ? <p className="text-center py-4" style={{ color: MUTED }}>No Reddit posts available</p>
              : posts.map((p) => <RedditCard key={p.id} post={p} />)
          }

          {/* X Pulse */}
          <div className="flex items-center gap-2 mt-3 mb-3">
            <span style={{ fontSize: 11, fontWeight: 800, color: PURPLE, letterSpacing: 1.5 }}>X PULSE</span>
            <span style={{ fontSize: 10, color: MUTED }}>AI-synthesised market sentiment</span>
          </div>

          {loadingSocial
            ? Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} rows={[{ w: '30%', h: 12 }, { w: '100%', h: 38 }]} />
              ))
            : pulse.length === 0
              ? <p className="text-center py-4" style={{ color: MUTED }}>No pulse data available</p>
              : pulse.map((item, i) => <XPulseCard key={i} item={item} />)
          }

          {loadingSocial && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: PURPLE, borderTopColor: 'transparent' }} />
              <span style={{ fontSize: 12, color: MUTED }}>Loading social pulse…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
