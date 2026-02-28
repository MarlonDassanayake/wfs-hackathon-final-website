'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingDown, TrendingUp, AlertTriangle, ArrowRight, X, RefreshCw } from 'lucide-react';
import { type LandingData, type LandingPick } from '@/services/gemini';
import { analyzeStock, getLandingData } from '@/services/clientApi';

const BG    = '#0D1117';
const CARD  = '#161B22';
const BORDER = '#30363D';
const MUTED = '#8B949E';
const GREEN = '#00E676';
const RED   = '#FF5252';
const AMBER = '#FFB74D';

// ── Pick card ────────────────────────────────────────────────────────────────
function PickCard({ pick, side }: { pick: LandingPick; side: 'short' | 'long' }) {
  const router = useRouter();
  const accent = side === 'short' ? RED : GREEN;
  const rec = side === 'short' ? 'SHORT' : 'LONG';
  return (
    <button
      onClick={() => router.push(`/stock/${pick.ticker}?rec=${rec}`)}
      className="w-full text-left rounded-xl p-3 transition-all hover:opacity-90 cursor-pointer"
      style={{ backgroundColor: CARD, border: `1px solid ${accent}40` }}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: 18, fontWeight: 900, color: accent, letterSpacing: 1 }}>{pick.ticker}</span>
        <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: accent + '20', color: accent }}>
          {pick.letter_grade}
        </span>
      </div>
      <p className="text-xs truncate mb-2" style={{ color: '#C9D1D9', fontWeight: 600 }}>{pick.name}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: MUTED }}>Score</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: accent }}>{pick.score}/100</span>
      </div>
    </button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, r = 6 }: { w?: string; h?: number; r?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: r, backgroundColor: CARD, opacity: 0.7 }}
    />
  );
}

function SkeletonCard({ accent }: { accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: CARD, border: `1px solid ${accent}30` }}>
      <div className="flex justify-between items-center mb-2">
        <Skeleton w="55%" h={18} />
        <Skeleton w="28px" h={18} r={4} />
      </div>
      <Skeleton w="80%" h={11} r={4} />
      <div className="mt-2">
        <Skeleton w="100%" h={14} r={4} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [query, setQuery]     = useState('');
  const [data, setData]       = useState<LandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    getLandingData()
      .then((d) => {
        setData(d);
        // Pre-warm analysis scores
        const picks = [
          ...d.top_shorts.map((p) => ({ ticker: p.ticker, rec: 'SHORT' as const, side: 'short' as const })),
          ...d.top_longs.map((p)  => ({ ticker: p.ticker, rec: 'LONG'  as const, side: 'long'  as const })),
        ];
        picks.forEach(async ({ ticker, rec, side }) => {
          try {
            const analysis = await analyzeStock(ticker, undefined, rec);
            const score = side === 'short' ? analysis.short_mode.total_score : analysis.long_mode.total_score;
            const letter_grade = side === 'short' ? analysis.short_mode.letter_grade : analysis.long_mode.letter_grade;
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
          } catch { /* silent */ }
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = useCallback((t?: string) => {
    const ticker = (t ?? query).toUpperCase().trim();
    if (!ticker) return;
    router.push(`/stock/${ticker}`);
  }, [query, router]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ALETHEIA" width={72} height={72} style={{ borderRadius: 10 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 900, color: '#FFFFFF', letterSpacing: 4, lineHeight: 1 }}>
            ALETHEIA
          </h1>
          <p style={{ fontSize: 13, color: MUTED, letterSpacing: 1, marginTop: 4 }}>Pocket-Sized Hedge Fund</p>
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div
          className="flex items-center gap-3 rounded-full px-4 mb-3"
          style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, padding: '14px 16px' }}
        >
          <Search size={20} color={MUTED} />
          <input
            type="text"
            placeholder="Enter stock name or ticker…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: 18, fontWeight: 700, color: '#E6EDF3', letterSpacing: 1 }}
            autoCorrect="off"
            autoCapitalize="characters"
            maxLength={10}
          />
          {query.length > 0 && (
            <button onClick={() => setQuery('')}>
              <X size={18} color={MUTED} />
            </button>
          )}
        </div>
        <button
          onClick={() => handleSearch()}
          className="w-full rounded-full flex items-center justify-center gap-2 font-bold transition-all hover:opacity-90"
          style={{ backgroundColor: '#1E88E5', paddingTop: 15, paddingBottom: 15, fontSize: 17, color: '#0D1117', fontWeight: 800 }}
        >
          <span>Analyse</span>
          <ArrowRight size={18} />
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl p-3 mb-5"
          style={{ backgroundColor: AMBER + '18', border: `1px solid ${AMBER}40` }}>
          <AlertTriangle size={16} color={AMBER} />
          <span className="flex-1 text-sm" style={{ color: AMBER }}>{error}</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold"
            style={{ backgroundColor: AMBER + '30', color: AMBER }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* ── Top Picks ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Short picks */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} color={RED} />
            <span style={{ fontSize: 10, fontWeight: 800, color: RED, letterSpacing: 1.5 }}>TOP SHORTS</span>
          </div>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} accent={RED} />)
            : data?.top_shorts.map((p) => <PickCard key={p.ticker} pick={p} side="short" />)
          }
        </div>

        {/* Long picks */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} color={GREEN} />
            <span style={{ fontSize: 10, fontWeight: 800, color: GREEN, letterSpacing: 1.5 }}>TOP LONGS</span>
          </div>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} accent={GREEN} />)
            : data?.top_longs.map((p) => <PickCard key={p.ticker} pick={p} side="long" />)
          }
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-6">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: GREEN, borderTopColor: 'transparent' }} />
          <span style={{ fontSize: 13, color: MUTED }}>ALETHEIA is scanning the market…</span>
        </div>
      )}
    </div>
  );
}
