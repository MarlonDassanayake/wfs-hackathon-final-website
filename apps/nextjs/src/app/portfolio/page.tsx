'use client';
import { useState, useMemo, useCallback } from 'react';
import { Briefcase, Shield, Search, Plus, X, AlertTriangle, Minus } from 'lucide-react';
import { type HedgeRecommendation } from '@/services/gemini';
import {
  calculatePortfolioMetrics,
  type PortfolioHolding,
} from '@/services/portfolioService';
import { generateHedgeRecommendations, fetchPortfolioStockData } from '@/services/clientApi';

const BG     = '#0D1117';
const CARD   = '#161B22';
const BORDER = '#30363D';
const MUTED  = '#8B949E';
const GREEN  = '#00E676';
const RED    = '#FF5252';
const AMBER  = '#FFB74D';
const BLUE   = '#00B0FF';
const PURPLE = '#B388FF';

const PIE_COLORS = ['#00E676','#00B0FF','#B388FF','#FFB74D','#FF5252','#FF8A65','#40C4FF','#EEFF41'];

// ── Allocation bar ────────────────────────────────────────────────────────────
function AllocationBar({ slices }: { slices: { pct: number; color: string; ticker: string }[] }) {
  if (!slices.length) {
    return <div className="h-7 rounded-lg" style={{ backgroundColor: BORDER }} />;
  }
  return (
    <div>
      <div className="flex rounded-lg overflow-hidden h-7">
        {slices.map((s, i) => (
          <div key={i} style={{ flex: s.pct / 100, backgroundColor: s.color, marginRight: i < slices.length - 1 ? 2 : 0 }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#E6EDF3' }}>{s.ticker}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Risk bar ──────────────────────────────────────────────────────────────────
function RiskBar({ ticker, pct, color }: { ticker: string; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span style={{ width: 48, fontSize: 12, fontWeight: 700, color: '#E6EDF3' }}>{ticker}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: BORDER }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
      </div>
      <span style={{ width: 44, fontSize: 12, fontWeight: 700, color, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── Sector bar ────────────────────────────────────────────────────────────────
function SectorBar({ sector, pct }: { sector: string; pct: number }) {
  const color = pct > 60 ? RED : pct > 40 ? AMBER : GREEN;
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="truncate" style={{ width: 100, fontSize: 12, color: MUTED }}>{sector}</span>
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, backgroundColor: BORDER }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: 6, borderRadius: 3, backgroundColor: color }} />
      </div>
      <span style={{ width: 44, fontSize: 12, fontWeight: 700, color, textAlign: 'right' }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center p-3 rounded-xl" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 20, fontWeight: 900, color }}>{value}</span>
      <span className="text-center" style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: 1, marginTop: 2 }}>{label}</span>
      {sub && <span style={{ fontSize: 10, color: MUTED, textAlign: 'center', marginTop: 1 }}>{sub}</span>}
    </div>
  );
}

// ── Hedge card ────────────────────────────────────────────────────────────────
function HedgeCard({ title, instruments, reason, accent }: { title: string; instruments: string[]; reason: string; accent: string }) {
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: CARD, border: `1px solid ${accent}40` }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: accent }}>{title}</span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {instruments.map((inst, i) => (
          <span key={i} className="px-2.5 py-1 rounded-lg" style={{ backgroundColor: accent + '18', fontSize: 11, fontWeight: 700, color: accent }}>
            {inst}
          </span>
        ))}
      </div>
      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>{reason}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);

  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResult,  setSearchResult]  = useState<{
    ticker: string; name: string; price: number; beta: number; sector: string; volatility: number;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError,   setSearchError]   = useState<string | null>(null);
  const [qtyText,       setQtyText]       = useState('1');

  const [hedgeData,    setHedgeData]    = useState<HedgeRecommendation | null>(null);
  const [hedgeLoading, setHedgeLoading] = useState(false);
  const [hedgeError,   setHedgeError]   = useState<string | null>(null);

  const metrics = useMemo(() => calculatePortfolioMetrics(holdings), [holdings]);

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
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Failed to fetch stock data');
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

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
      return [...prev, {
        ticker: searchResult.ticker, name: searchResult.name,
        livePrice: searchResult.price, quantity: qty, allocation: value,
        beta: searchResult.beta, sector: searchResult.sector, volatility: searchResult.volatility,
      }];
    });
    setHedgeData(null);
    setSearchQuery('');
    setSearchResult(null);
    setQtyText('1');
  }, [searchResult, qtyText]);

  const handleRemove = useCallback((ticker: string) => {
    setHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
    setHedgeData(null);
  }, []);

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

  const handleGenerateHedge = useCallback(async () => {
    if (holdings.length === 0) return;
    setHedgeLoading(true);
    setHedgeError(null);
    try {
      const totalAlloc = holdings.reduce((s, h) => s + h.allocation, 0);
      const portfolioArg = holdings.map((h) => ({
        ticker: h.ticker, sector: h.sector,
        weight: h.allocation / (totalAlloc || 1), beta: h.beta,
      }));
      const result = await generateHedgeRecommendations(portfolioArg, {
        beta: metrics.beta, volatility: metrics.volatility,
        sharpe: metrics.sharpe, sectorConcentration: metrics.sectorConcentration,
      });
      setHedgeData(result);
    } catch (e: unknown) {
      setHedgeError(e instanceof Error ? e.message : 'Failed to generate hedge recommendations');
    } finally {
      setHedgeLoading(false);
    }
  }, [holdings, metrics]);

  const allocSlices = useMemo(() => {
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
    if (b > 1.3) return { label: 'AGGRESSIVE', color: RED };
    if (b > 1.0) return { label: 'ELEVATED',   color: AMBER };
    if (b > 0.7) return { label: 'MODERATE',   color: GREEN };
    return           { label: 'DEFENSIVE',   color: BLUE };
  }

  const bInfo = betaLabel(metrics.beta);
  const hasSectorRisk = Object.values(metrics.sectorConcentration).some((v) => v > 60);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">

      {/* ── Section 1 Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <Briefcase size={22} color={BLUE} />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#E6EDF3', letterSpacing: 2 }}>FACTOR BASED INVESTMENT</h1>
      </div>

      {/* ── Add stock panel ──────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>ADD STOCK</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="TICKER (e.g. AAPL)"
            className="flex-1 rounded-lg px-3 py-2.5 outline-none"
            style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, fontSize: 16, fontWeight: 800, color: '#E6EDF3', letterSpacing: 1 }}
            maxLength={6}
          />
          <button
            onClick={handleSearch}
            disabled={searchLoading || !searchQuery.trim()}
            className="flex items-center justify-center rounded-lg transition-all"
            style={{ backgroundColor: BLUE, width: 44, height: 44, flexShrink: 0, opacity: (!searchQuery.trim() || searchLoading) ? 0.6 : 1 }}
          >
            {searchLoading
              ? <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: BG, borderTopColor: 'transparent' }} />
              : <Search size={18} color={BG} />
            }
          </button>
        </div>

        {searchError && <p style={{ fontSize: 11, color: RED, marginTop: 4 }}>{searchError}</p>}

        {searchResult && (
          <div className="mt-3">
            <p style={{ fontSize: 13, fontWeight: 700, color: '#E6EDF3' }}>{searchResult.name}</p>
            <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
              ${searchResult.price.toFixed(2)} · β {searchResult.beta.toFixed(2)} · {searchResult.sector}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <span style={{ fontSize: 12, color: '#E6EDF3' }}>Quantity:</span>
              <input
                type="number"
                value={qtyText}
                onChange={(e) => setQtyText(e.target.value)}
                className="rounded-lg text-center outline-none"
                style={{ backgroundColor: BG, border: `1px solid ${BORDER}`, padding: '6px 10px', fontSize: 14, fontWeight: 700, color: '#E6EDF3', width: 72 }}
                min={1}
                max={999999}
              />
              <span style={{ fontSize: 12, color: MUTED }}>shares</span>
            </div>
            <button
              onClick={handleAdd}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-3 font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: GREEN, fontSize: 14, color: BG }}
            >
              <Plus size={14} />
              Add to Portfolio
            </button>
          </div>
        )}
      </div>

      {/* ── Allocation bar ───────────────────────────────────────────────── */}
      {holdings.length > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>PORTFOLIO ALLOCATION</p>
          <AllocationBar slices={allocSlices} />
        </div>
      )}

      {/* ── Holdings list ────────────────────────────────────────────────── */}
      {holdings.length > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>HOLDINGS</p>
          {holdings.map((h, i) => {
            const color = PIE_COLORS[i % PIE_COLORS.length];
            const pct = holdingPct(h);
            const rc = metrics.riskContributions.find((r) => r.ticker === h.ticker);
            return (
              <div key={h.ticker} className="flex items-center gap-3 py-3" style={{ borderTop: `1px solid ${BORDER}` }}>
                <div style={{ width: 4, height: 44, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontSize: 15, fontWeight: 900, color }}>{h.ticker}</span>
                    <span className="truncate" style={{ fontSize: 11, color: MUTED }}>{h.name}</span>
                  </div>
                  {rc && <p style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>Risk contribution: {rc.contribution.toFixed(1)}%</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustAllocation(h.ticker, -5)}
                    className="px-2 py-1 rounded-md text-xs font-bold"
                    style={{ backgroundColor: BORDER, color: '#E6EDF3' }}
                  >−5%</button>
                  <span className="text-center" style={{ fontSize: 13, fontWeight: 800, color, width: 44 }}>{pct.toFixed(1)}%</span>
                  <button
                    onClick={() => adjustAllocation(h.ticker, 5)}
                    className="px-2 py-1 rounded-md text-xs font-bold"
                    style={{ backgroundColor: BORDER, color: '#E6EDF3' }}
                  >+5%</button>
                </div>
                <button onClick={() => handleRemove(h.ticker)} className="ml-1 p-1 rounded">
                  <X size={16} color={MUTED} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Portfolio Metrics ─────────────────────────────────────────────── */}
      {holdings.length > 0 && (
        <div className="mb-4">
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>PORTFOLIO METRICS</p>
          <div className="flex gap-2">
            <MetricCard label="PORTFOLIO β" value={metrics.beta.toFixed(2)} color={bInfo.color} sub={bInfo.label} />
            <MetricCard label="VOLATILITY σ" value={`${(metrics.volatility * 100).toFixed(1)}%`} color={metrics.volatility > 0.35 ? RED : metrics.volatility > 0.20 ? AMBER : GREEN} />
            <MetricCard label="SHARPE" value={metrics.sharpe.toFixed(2)} color={metrics.sharpe > 1 ? GREEN : metrics.sharpe > 0.5 ? AMBER : RED} />
            <MetricCard label="ALPHA" value={`${metrics.alpha >= 0 ? '+' : ''}${(metrics.alpha * 100).toFixed(1)}%`} color={metrics.alpha >= 0 ? GREEN : RED} />
          </div>
        </div>
      )}

      {/* ── Risk contributions ───────────────────────────────────────────── */}
      {holdings.length > 0 && metrics.riskContributions.length > 0 && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>RISK CONTRIBUTION PER STOCK</p>
          {[...metrics.riskContributions]
            .sort((a, b) => b.contribution - a.contribution)
            .map((rc) => {
              const hi = holdings.findIndex((h) => h.ticker === rc.ticker);
              return <RiskBar key={rc.ticker} ticker={rc.ticker} pct={rc.contribution} color={PIE_COLORS[hi % PIE_COLORS.length]} />;
            })}
        </div>
      )}

      {/* ── Section 2: Hedge ──────────────────────────────────────────────── */}
      {holdings.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-2 mb-4">
            <Shield size={18} color={PURPLE} />
            <h2 style={{ fontSize: 24, fontWeight: 900, color: PURPLE, letterSpacing: 2 }}>HEDGE MY PORTFOLIO</h2>
          </div>

          {/* Portfolio Beta card */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5 }}>PORTFOLIO BETA</p>
                <p style={{ fontSize: 40, fontWeight: 900, color: bInfo.color }}>{metrics.beta.toFixed(2)}</p>
                <span className="inline-block px-3 py-1 rounded-md mt-1" style={{ backgroundColor: bInfo.color + '20', fontSize: 11, fontWeight: 800, color: bInfo.color, letterSpacing: 1 }}>
                  {bInfo.label}
                </span>
              </div>
              <div className="text-right">
                <p style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>S&P 500</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: MUTED, marginTop: 2 }}>1.0 baseline</p>
              </div>
            </div>
          </div>

          {/* Sector concentration */}
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>SECTOR CONCENTRATION</p>
            {Object.entries(metrics.sectorConcentration)
              .sort(([, a], [, b]) => b - a)
              .map(([sector, pct]) => <SectorBar key={sector} sector={sector} pct={pct} />)}
            {hasSectorRisk && (
              <div className="flex items-center gap-2 mt-2">
                <AlertTriangle size={13} color={AMBER} />
                <span style={{ fontSize: 12, color: AMBER }}>High sector concentration risk detected</span>
              </div>
            )}
          </div>

          {/* Hedge button */}
          {!hedgeData && (
            <div>
              <button
                onClick={handleGenerateHedge}
                disabled={hedgeLoading}
                className="w-full flex items-center justify-center gap-3 rounded-2xl font-bold transition-all hover:opacity-90"
                style={{ backgroundColor: PURPLE, padding: '16px', fontSize: 15, color: BG, opacity: hedgeLoading ? 0.6 : 1, letterSpacing: 0.3 }}
              >
                {hedgeLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: BG, borderTopColor: 'transparent' }} />
                    ALETHEIA is building your hedge…
                  </>
                ) : (
                  <>
                    <Shield size={18} />
                    Generate Hedge Recommendations
                  </>
                )}
              </button>
              {hedgeError && <p className="text-center mt-2" style={{ fontSize: 12, color: RED }}>{hedgeError}</p>}
            </div>
          )}

          {/* Hedge results */}
          {hedgeData && (
            <div className="animate-fade-in">
              {/* Risk Exposure Summary */}
              <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${PURPLE}40` }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: PURPLE, letterSpacing: 1.5, marginBottom: 8 }}>RISK EXPOSURE SUMMARY</p>
                <p style={{ fontSize: 13, color: '#C9D1D9', lineHeight: 1.6 }}>{hedgeData.aletheiaInsight}</p>
              </div>

              <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 10 }}>HEDGE RECOMMENDATIONS</p>
              <HedgeCard title={hedgeData.hedge1.title} instruments={hedgeData.hedge1.instruments} reason={hedgeData.hedge1.reason} accent={GREEN} />
              <HedgeCard title={hedgeData.hedge2.title} instruments={hedgeData.hedge2.instruments} reason={hedgeData.hedge2.reason} accent={BLUE} />
              <HedgeCard title={hedgeData.hedge3.title} instruments={hedgeData.hedge3.instruments} reason={hedgeData.hedge3.reason} accent={AMBER} />

              {/* Risk Reduction Simulation */}
              <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: CARD, border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 1.5, marginBottom: 12 }}>RISK REDUCTION SIMULATION</p>
                <div className="flex items-center justify-around py-2">
                  <div className="flex flex-col items-center gap-1">
                    <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>Current Beta</span>
                    <span style={{ fontSize: 28, fontWeight: 900, color: bInfo.color }}>{metrics.beta.toFixed(2)}</span>
                  </div>
                  <span style={{ fontSize: 20, color: MUTED }}>→</span>
                  <div className="flex flex-col items-center gap-1">
                    <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>After Hedge</span>
                    <span style={{ fontSize: 28, fontWeight: 900, color: GREEN }}>{hedgeData.hedgeBeta.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 p-3 rounded-xl" style={{ backgroundColor: GREEN + '18', border: `1px solid ${GREEN}40` }}>
                  <Minus size={14} color={GREEN} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>
                    Projected Volatility Reduction: −{hedgeData.volatilityReduction}%
                  </span>
                </div>
              </div>

              <button
                onClick={() => { setHedgeData(null); setHedgeError(null); }}
                className="w-full text-center py-3"
                style={{ fontSize: 12, color: MUTED, textDecoration: 'underline' }}
              >
                Recalculate Hedge
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {holdings.length === 0 && (
        <div className="flex flex-col items-center py-16 gap-4">
          <Briefcase size={48} color={MUTED} />
          <p style={{ fontSize: 18, fontWeight: 800, color: MUTED }}>No holdings yet</p>
          <p className="text-center" style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, maxWidth: 360 }}>
            Search for a stock above and add it to your portfolio to get factor-based risk analysis and hedge recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
