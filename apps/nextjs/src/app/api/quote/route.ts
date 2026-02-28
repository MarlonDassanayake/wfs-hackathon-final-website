import { NextRequest, NextResponse } from 'next/server';

function toExchangeCode(name: string): string {
  const n = (name ?? '').toUpperCase();
  if (n.includes('NASDAQ') || ['NMS','NGM','NCM','NAS'].includes(n)) return 'NASDAQ';
  if (n.includes('NYSE')   || ['NYQ','NYS'].includes(n))             return 'NYSE';
  if (['PCX','ASE','AMX','AMEX'].includes(n))                        return 'AMEX';
  if (n.includes('LSE'))  return 'LSE';
  if (n.includes('TSX'))  return 'TSX';
  return n;
}

function fmtCap(cap: number): string {
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
  if (cap >= 1e9)  return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toFixed(0)}`;
}

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get('ticker')?.toUpperCase();
  if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 });

  // Try Yahoo Finance v7 quote API first
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`,
      { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } },
    );
    if (res.ok) {
      const json = await res.json();
      const q = json?.quoteResponse?.result?.[0];
      if (q) {
        const price     = q.regularMarketPrice ?? 0;
        const prevClose = q.regularMarketPreviousClose ?? price;
        const change    = price - prevClose;
        const changePct = prevClose ? (change / prevClose) * 100 : 0;
        const exc       = toExchangeCode(q.fullExchangeName ?? q.exchange ?? '');
        return NextResponse.json({
          ticker,
          name:                    q.longName ?? q.shortName ?? ticker,
          price,
          priceFormatted:          `$${price.toFixed(2)}`,
          change,
          changeFormatted:         `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)}`,
          changePercent:           changePct,
          changePercentFormatted:  `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
          exchange:                exc,
          tradingViewSymbol:       exc ? `${exc}:${ticker}` : ticker,
          marketCap:               q.marketCap ? fmtCap(q.marketCap) : undefined,
          currency:                q.currency ?? 'USD',
        });
      }
    }
  } catch { /* fall through to v8 */ }

  // Fallback: Yahoo Finance v8 chart API
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d&includePrePost=false`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    );
    if (!res.ok) throw new Error(`Yahoo Finance ${res.status} for ${ticker}`);

    const json   = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error(`No data found for ${ticker}`);

    const meta      = result.meta;
    const price     = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.regularMarketPreviousClose ?? price;
    const change    = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    const exc       = toExchangeCode(meta.exchangeName ?? meta.fullExchangeName ?? '');

    return NextResponse.json({
      ticker,
      name:                    meta.longName ?? meta.shortName ?? ticker,
      price,
      priceFormatted:          `$${price.toFixed(2)}`,
      change,
      changeFormatted:         `${change >= 0 ? '+' : ''}$${Math.abs(change).toFixed(2)}`,
      changePercent:           changePct,
      changePercentFormatted:  `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      exchange:                exc,
      tradingViewSymbol:       exc ? `${exc}:${ticker}` : ticker,
      marketCap:               meta.marketCap ? fmtCap(meta.marketCap) : undefined,
      currency:                meta.currency ?? 'USD',
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch quote' },
      { status: 500 },
    );
  }
}
