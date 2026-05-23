import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { InsiderTrade } from '@/types/insider';
import type { InstitutionHolding } from '@/types/institution';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';
import ChartPanel from '@/components/ChartPanel';

import insiderTradesRaw from '@/data/insider-trades.json';
import institutionHoldingsRaw from '@/data/institution-holdings.json';

const ALL_TRADES: InsiderTrade[] = insiderTradesRaw as InsiderTrade[];
const ALL_HOLDINGS: InstitutionHolding[] = institutionHoldingsRaw as InstitutionHolding[];

// ─── Constants ────────────────────────────────────────────────
const ROW_H = 20;
const COLORS = {
  amber: '#ff8c00',
  amberDim: '#b36800',
  green: '#0c6',
  red: '#f33',
  white: '#e6e6e6',
  gray: '#888',
  grayDim: '#555',
  grayDark: '#333',
  border: '#1f1f1f',
  bgPanel: '#0a0a0a',
  bgRow: 'rgba(255,255,255,0.03)',
  purple: '#8b5cf6',
};

const STYLES = {
  header: {
    height: 28, background: '#0a0a0a', borderBottom: '1px solid #1f1f1f',
    display: 'flex', alignItems: 'center', padding: '0 8px', flexShrink: 0,
  } as React.CSSProperties,
  footer: {
    height: 22, background: '#0a0a0a', borderTop: '1px solid #1f1f1f',
    display: 'flex', alignItems: 'center', padding: '0 10px',
    fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
  } as React.CSSProperties,
  sectionHeader: {
    height: 22, background: '#0a0a0a', borderBottom: '1px solid #1f1f1f',
    display: 'flex', alignItems: 'center', padding: '0 8px',
    fontSize: 9, color: '#ff8c00', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 1,
    fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
  } as React.CSSProperties,
};

// ─── Sub-Components (self-contained for lazy chunk) ────────────

function Row({ children, h }: { children: React.ReactNode; h?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: ROW_H,
      padding: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
      background: h ? COLORS.bgRow : 'transparent',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      flexShrink: 0,
    }}>{children}</div>
  );
}

function Cell({ w, color, bold, onClick, children }: {
  w: number; color: string; bold?: boolean;
  onClick?: () => void; children: React.ReactNode;
}) {
  return (
    <span onClick={onClick} style={{
      width: w, color, fontWeight: bold ? 600 : 400,
      cursor: onClick ? 'pointer' : 'default',
      display: 'inline-block', height: ROW_H, lineHeight: `${ROW_H}px`,
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      verticalAlign: 'middle', fontFamily: 'JetBrains Mono, monospace',
      fontSize: 11, padding: '0 3px',
    }} onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={typeof children === 'string' ? children : undefined}
    >{children}</span>
  );
}

function RCell({ w, c, b, onClick, children }: {
  w: number; c: string; b?: boolean;
  onClick?: () => void; children: React.ReactNode;
}) {
  return (
    <span onClick={onClick} style={{
      display: 'inline-block', width: w, height: ROW_H, lineHeight: `${ROW_H}px`,
      color: c, fontWeight: b ? 600 : 400, fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace',
      textAlign: 'right', padding: '0 3px', whiteSpace: 'nowrap',
      overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle',
      cursor: onClick ? 'pointer' : 'default',
    }} onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={typeof children === 'string' ? children : undefined}
    >{children}</span>
  );
}

function FilterBtn({ active, color, onClick, children }: {
  active: boolean; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#1a1a1a' : 'transparent',
      border: `1px solid ${active ? color : '#333'}`,
      color: active ? color : '#888',
      cursor: 'pointer', fontSize: 8, padding: '1px 6px',
      fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
      lineHeight: '16px',
    }}>{children}</button>
  );
}

// ─── Confidence Score Computation ───────────────────────────────

function computeConfidence(trades: InsiderTrade[]): {
  score: number; buys: number; sells: number; buyVal: number; sellVal: number;
  netVal: number; totalTrades: number; uniqueBuyers: number;
} {
  const buys = trades.filter(t => t.transaction_type === 'BUY');
  const sells = trades.filter(t => t.transaction_type === 'SELL');
  const total = trades.length;
  if (total === 0) return { score: 0, buys: 0, sells: 0, buyVal: 0, sellVal: 0, netVal: 0, totalTrades: 0, uniqueBuyers: 0 };

  const buyVal = buys.reduce((s, t) => s + t.total_value, 0);
  const sellVal = sells.reduce((s, t) => s + t.total_value, 0);
  const netVal = buyVal - sellVal;
  const buyRatio = total > 0 ? buys.length / total : 0;
  const uniqueBuyers = new Set(buys.map(t => t.insider_name)).size;

  // Score: weighted combination
  let score = 0;
  score += buyRatio * 50;                    // buy/sell ratio (max 50)
  score += Math.min(uniqueBuyers * 8, 20);   // unique buyers (max 20)
  const valScore = Math.min(Math.abs(netVal) / 500_000 * 15, 15); // value (max 15)
  score += netVal > 0 ? valScore : -valScore;
  score += Math.min(total / 10 * 15, 15);    // total trade count (max 15)

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    buys: buys.length, sells: sells.length,
    buyVal, sellVal, netVal, totalTrades: total, uniqueBuyers,
  };
}

// ─── localStorage Watchlist ─────────────────────────────────────

const WATCHLIST_KEY = 'neixian_watchlist';

function loadWatchlist(): Set<string> {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveWatchlist(set: Set<string>) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify([...set]));
}

// ─── Main StockDetailPage ───────────────────────────────────────

export default function StockDetailPage() {
  const navigate = useNavigate();
  const { ticker } = useParams<{ ticker: string }>();
  const upperTicker = (ticker || '').toUpperCase();
  const today = new Date().toISOString().slice(0, 10);

  const [filter, setFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [watchSet, setWatchSet] = useState<Set<string>>(loadWatchlist);

  // Filter trades for this ticker
  const tickerTrades = useMemo(() => {
    return ALL_TRADES
      .filter(t => t.target_ticker.toUpperCase() === upperTicker)
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  }, [upperTicker]);

  const confidence = useMemo(() => computeConfidence(tickerTrades), [tickerTrades]);

  // Institution holdings for this ticker
  const tickerHoldings = useMemo(() => {
    return ALL_HOLDINGS
      .filter(h => h.ticker.toUpperCase() === upperTicker)
      .sort((a, b) => b.market_value - a.market_value);
  }, [upperTicker]);

  // Company name
  const companyName = tickerTrades[0]?.target_company || upperTicker;

  // Filtered trades
  const displayTrades = useMemo(() => {
    if (filter === 'ALL') return tickerTrades.slice(0, 30);
    return tickerTrades.filter(t => t.transaction_type === filter).slice(0, 30);
  }, [tickerTrades, filter]);

  // Watchlist
  const isWatched = watchSet.has(upperTicker);
  const toggleWatch = useCallback(() => {
    setWatchSet(prev => {
      const next = new Set(prev);
      if (next.has(upperTicker)) next.delete(upperTicker);
      else next.add(upperTicker);
      saveWatchlist(next);
      return next;
    });
  }, [upperTicker]);

  // Color for confidence score
  const scoreColor = confidence.score >= 60 ? COLORS.green
    : confidence.score >= 30 ? COLORS.amber
    : COLORS.red;

  // If no ticker provided
  if (!upperTicker) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000' }}>
        <div style={STYLES.header}>
          <button onClick={() => navigate(-1)} style={{
            background: 'transparent', border: '1px solid #333', color: '#ff8c00',
            cursor: 'pointer', padding: '3px 10px', fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>← BACK</button>
          <span style={{ color: '#888', marginLeft: 12, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
            No ticker specified.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{...STYLES.header, gap: 12}}>
        <button onClick={() => navigate(-1)} style={{
          background: 'transparent', border: '1px solid #333', color: '#ff8c00',
          cursor: 'pointer', padding: '3px 10px', fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
        }}>
          ← BACK
        </button>
        <span style={{ color: '#ff8c00', fontWeight: 700, fontSize: 16, letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>
          {upperTicker}
        </span>
        <span style={{ color: '#888', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
          {truncate(companyName, 24)}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
            {confidence.totalTrades} trades / 2YR
          </span>
          <button onClick={toggleWatch} style={{
            background: 'transparent',
            border: isWatched ? '1px solid #ff8c00' : '1px solid #333',
            color: isWatched ? '#ff8c00' : '#555',
            cursor: 'pointer', fontSize: 14, padding: '2px 8px',
            borderRadius: 2, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1,
          }}>
            {isWatched ? '★' : '☆'} WATCH
          </button>
        </span>
      </div>

      {/* ── Scrollable Body ────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {/* ── Confidence Score ─────────────────────────────────── */}
        <div style={{ padding: 10 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            {/* Left: Confidence bar */}
            <div style={{ padding: 10, background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 9, color: COLORS.grayDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                CONFIDENCE SCORE
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 10, background: COLORS.border, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${confidence.score}%`,
                      background: scoreColor,
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: scoreColor, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                    {confidence.score}
                  </div>
                  <div style={{ fontSize: 9, color: COLORS.grayDim, fontFamily: 'JetBrains Mono, monospace' }}>
                    /100
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Sub-scores */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
              padding: 10, background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`,
            }}>
              {([
                { label: 'BUY SCALE', value: confidence.buys.toString(), color: COLORS.green },
                { label: 'SELL SCALE', value: confidence.sells.toString(), color: COLORS.red },
                { label: 'BUY/SELL', value: confidence.totalTrades > 0
                  ? `${((confidence.buys / confidence.totalTrades) * 100).toFixed(0)}%`
                  : '--', color: confidence.buys >= confidence.sells ? COLORS.green : COLORS.red },
                { label: 'BUYERS', value: confidence.uniqueBuyers.toString(), color: COLORS.amber },
              ] as const).map(item => (
                <div key={item.label} style={{ textAlign: 'center', padding: '4px 2px' }}>
                  <div style={{ fontSize: 7, color: COLORS.grayDim, fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Net Flow row (spans both columns) */}
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex', gap: 12, flexWrap: 'wrap',
              padding: '6px 10px', background: COLORS.bgPanel,
              border: `1px solid ${COLORS.border}`,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            }}>
              <span style={{ color: COLORS.gray }}>
                NET FLOW:{' '}
                <span style={{
                  color: confidence.netVal >= 0 ? COLORS.green : COLORS.red,
                  fontWeight: 700,
                }}>
                  {formatCurrency(confidence.netVal)}
                </span>
              </span>
              <span style={{ color: COLORS.gray }}>
                BUY TOTAL: <span style={{ color: COLORS.green, fontWeight: 600 }}>{formatCurrency(confidence.buyVal)}</span>
              </span>
              <span style={{ color: COLORS.gray }}>
                SELL TOTAL: <span style={{ color: COLORS.red, fontWeight: 600 }}>{formatCurrency(confidence.sellVal)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Price Chart ──────────────────────────────────────── */}
        <div style={{ padding: '0 10px 10px' }}>
          <div style={STYLES.sectionHeader}>
            PRICE CHART (90D) — {upperTicker}
          </div>
          <div style={{ padding: 10, background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderTop: 0 }}>
            <ChartPanel ticker={upperTicker} />
          </div>
        </div>

        {/* ── Institution Holdings ─────────────────────────────── */}
        <div style={{ padding: '0 10px 10px' }}>
          <div style={STYLES.sectionHeader}>
            INSTITUTION HOLDINGS ({tickerHoldings.length})
          </div>
          {tickerHoldings.length === 0 ? (
            <div style={{
              padding: 20, background: COLORS.bgPanel,
              border: `1px solid ${COLORS.border}`, borderTop: 0,
              textAlign: 'center', fontSize: 10, color: COLORS.grayDim,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              No institution holdings found for {upperTicker}.
            </div>
          ) : (
            <div style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderTop: 0 }}>
              {/* Table header */}
              <Row>
                <Cell w={160} color={COLORS.grayDim} bold>INSTITUTION</Cell>
                <RCell w={80} c={COLORS.grayDim} b>VALUE</RCell>
                <RCell w={70} c={COLORS.grayDim} b>CHANGE</RCell>
                <RCell w={60} c={COLORS.grayDim} b>WEIGHT%</RCell>
                <Cell w={80} color={COLORS.grayDim} bold>REPORT</Cell>
              </Row>
              {/* Data rows */}
              {tickerHoldings.slice(0, 20).map((h, i) => (
                <Row key={h.id} h={i % 2 === 0}>
                  <Cell w={160} color={COLORS.white}>{truncate(h.institution_name, 24)}</Cell>
                  <RCell w={80} c={COLORS.white}>{formatCurrency(h.market_value)}</RCell>
                  <RCell w={70} c={h.change_qoq >= 0 ? COLORS.green : COLORS.red} b>
                    {h.change_qoq >= 0 ? '+' : ''}{h.change_qoq.toFixed(1)}%
                  </RCell>
                  <RCell w={60} c={COLORS.gray}>{h.portfolio_weight.toFixed(2)}%</RCell>
                  <Cell w={80} color={COLORS.gray}>{h.report_date}</Cell>
                </Row>
              ))}
              {tickerHoldings.length > 20 && (
                <div style={{
                  padding: '4px 10px', fontSize: 9, color: COLORS.grayDim,
                  fontFamily: 'JetBrains Mono, monospace', textAlign: 'center',
                  borderTop: `1px solid ${COLORS.border}`,
                }}>
                  ... and {tickerHoldings.length - 20} more holdings
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Insider Trades Timeline ──────────────────────────── */}
        <div style={{ padding: '0 10px 10px' }}>
          <div style={STYLES.sectionHeader}>
            <span>INSIDER TRADES ({tickerTrades.length})</span>
            <span style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
              <FilterBtn active={filter === 'ALL'} color={COLORS.amber} onClick={() => setFilter('ALL')}>
                ALL ({tickerTrades.length})
              </FilterBtn>
              <FilterBtn active={filter === 'BUY'} color={COLORS.green} onClick={() => setFilter('BUY')}>
                🟢 BUY ({confidence.buys})
              </FilterBtn>
              <FilterBtn active={filter === 'SELL'} color={COLORS.red} onClick={() => setFilter('SELL')}>
                🔴 SELL ({confidence.sells})
              </FilterBtn>
            </span>
          </div>
          {displayTrades.length === 0 ? (
            <div style={{
              padding: 20, background: COLORS.bgPanel,
              border: `1px solid ${COLORS.border}`, borderTop: 0,
              textAlign: 'center', fontSize: 10, color: COLORS.grayDim,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              No {filter !== 'ALL' ? filter : ''} trades for {upperTicker}.
            </div>
          ) : (
            <div style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderTop: 0 }}>
              {/* Table header */}
              <Row>
                <Cell w={62} color={COLORS.grayDim} bold>DATE</Cell>
                <Cell w={115} color={COLORS.grayDim} bold>INSIDER</Cell>
                <Cell w={105} color={COLORS.grayDim} bold>TITLE</Cell>
                <RCell w={42} c={filter === 'BUY' ? COLORS.green : filter === 'SELL' ? COLORS.red : COLORS.grayDim} b>DIR</RCell>
                <RCell w={60} c={COLORS.grayDim} b>SHARES</RCell>
                <RCell w={62} c={COLORS.grayDim} b>PRICE</RCell>
                <RCell w={70} c={COLORS.grayDim} b>VALUE</RCell>
              </Row>
              {/* Data rows */}
              {displayTrades.map((t, i) => {
                const isBuy = t.transaction_type === 'BUY';
                return (
                  <Row key={t.id} h={i % 2 === 0}>
                    <Cell w={62} color={COLORS.gray}>{formatDate(t.transaction_date)}</Cell>
                    <Cell w={115} color={COLORS.white}>{truncate(t.insider_name, 16)}</Cell>
                    <Cell w={105} color={COLORS.gray}>{truncate(t.insider_title, 15)}</Cell>
                    <RCell w={42} c={isBuy ? COLORS.green : COLORS.red} b>
                      {isBuy ? 'BUY' : 'SEL'}
                    </RCell>
                    <RCell w={60} c={COLORS.white}>
                      {t.shares.toLocaleString()}
                    </RCell>
                    <RCell w={62} c={COLORS.gray}>
                      ${t.price_per_share.toFixed(2)}
                    </RCell>
                    <RCell w={70} c={isBuy ? COLORS.green : COLORS.red}>
                      {formatCurrency(t.total_value)}
                    </RCell>
                  </Row>
                );
              })}
              {tickerTrades.length > 30 && (
                <div style={{
                  padding: '4px 10px', fontSize: 9, color: COLORS.grayDim,
                  fontFamily: 'JetBrains Mono, monospace', textAlign: 'center',
                  borderTop: `1px solid ${COLORS.border}`,
                }}>
                  ... and {tickerTrades.length - 30} more trades
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div style={STYLES.footer}>
        <span>STOCK/{upperTicker} | {truncate(companyName, 20)}</span>
        <span style={{ marginLeft: 'auto' }}>
          {confidence.totalTrades} trades | CONF {confidence.score} | {today}
        </span>
      </div>
    </div>
  );
}
