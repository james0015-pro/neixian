import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InsiderTrade } from '@/types/insider';
import { formatCurrency, formatDate, truncate } from '@/lib/utils';

import insiderTradesRaw from '@/data/insider-trades.json';

const ALL_TRADES: InsiderTrade[] = insiderTradesRaw as InsiderTrade[];

// ─── Constants ────────────────────────────────────────────────
const ROW_H = 20;
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
};

// ─── Sub-Components ───────────────────────────────────────────

function Row({ children, h }: { children: React.ReactNode; h?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: ROW_H,
      padding: 0, fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
      background: h ? 'rgba(255,255,255,0.03)' : 'transparent',
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
    }}>{children}</span>
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
    }}>{children}</span>
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
      cursor: 'pointer', fontSize: 9, padding: '2px 10px',
      fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
      whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

function SortHeader({ w, color, field, currentSort, onSort, right, label }: {
  w: number; color: string; field: string; currentSort: { field: string; dir: string };
  onSort: (f: string) => void; right?: boolean; label: string;
}) {
  const active = currentSort.field === field;
  const arrow = active ? (currentSort.dir === 'asc' ? ' ▴' : ' ▾') : '';
  const c = active ? '#ff8c00' : color;

  if (right) {
    return (
      <RCell w={w} c={c} b onClick={() => onSort(field)}>
        {label}{arrow}
      </RCell>
    );
  }
  return (
    <Cell w={w} color={c} bold onClick={() => onSort(field)}>
      {label}{arrow}
    </Cell>
  );
}

// ─── Signal Badge ─────────────────────────────────────────────

function SignalBadge({ score }: { score: number }) {
  const c = score >= 60 ? '#0c6' : score >= 30 ? '#ff8c00' : '#f33';
  const bg = score >= 60 ? 'rgba(0,204,102,0.1)' : score >= 30 ? 'rgba(255,140,0,0.1)' : 'rgba(255,51,51,0.1)';
  return (
    <span style={{
      display: 'inline-block', padding: '1px 6px', borderRadius: 2,
      background: bg, color: c, fontWeight: 700, fontSize: 10,
      fontFamily: 'JetBrains Mono, monospace',
      border: `1px solid ${c}33`,
    }}>{score}</span>
  );
}

// ─── Summary Aggregation ──────────────────────────────────────

interface TickerSummary {
  ticker: string;
  company: string;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
  lastDate: string;
  signal: number;
}

function computeSummaries(trades: InsiderTrade[]): TickerSummary[] {
  const map = new Map<string, {
    company: string; buys: number; sells: number;
    buyVal: number; sellVal: number; lastDate: string;
  }>();
  for (const t of trades) {
    const key = t.target_ticker;
    if (!map.has(key)) map.set(key, { company: t.target_company, buys: 0, sells: 0, buyVal: 0, sellVal: 0, lastDate: t.transaction_date });
    const entry = map.get(key)!;
    if (t.transaction_type === 'BUY') { entry.buys++; entry.buyVal += t.total_value; }
    else { entry.sells++; entry.sellVal += t.total_value; }
    if (t.transaction_date > entry.lastDate) entry.lastDate = t.transaction_date;
  }

  return [...map.entries()].map(([ticker, d]) => {
    const total = d.buys + d.sells;
    const netVal = d.buyVal - d.sellVal;
    // Signal: weighted score based on buy ratio + volume scale
    const buyRatio = total > 0 ? d.buys / total : 0;
    const volumeScore = Math.min(1, (d.buyVal + d.sellVal) / 1_000_000) * 15;
    const signal = Math.round(Math.min(100, buyRatio * 70 + volumeScore + (netVal > 0 ? 15 : 0)));
    return {
      ticker, company: d.company,
      buyCount: d.buys, sellCount: d.sells,
      buyValue: d.buyVal, sellValue: d.sellVal,
      netValue: netVal, lastDate: d.lastDate,
      signal,
    };
  });
}

// ─── Main Screener Page ───────────────────────────────────────

export default function ScreenerPage() {
  const navigate = useNavigate();

  // Filters
  const [dirFilter, setDirFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [tickerFilter, setTickerFilter] = useState<string>('ALL');

  // View mode
  const [viewMode, setViewMode] = useState<'SUMMARY' | 'TRADES'>('SUMMARY');

  // Sort state
  const [summarySort, setSummarySort] = useState<{ field: string; dir: string }>({ field: 'netValue', dir: 'desc' });
  const [tradeSort, setTradeSort] = useState<{ field: string; dir: string }>({ field: 'transaction_date', dir: 'desc' });

  const today = new Date().toISOString().slice(0, 10);

  // Get unique tickers
  const uniqueTickers = useMemo(() => {
    const set = new Set(ALL_TRADES.map(t => t.target_ticker));
    return ['ALL', ...[...set].sort()];
  }, []);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    let trades = [...ALL_TRADES];
    if (dirFilter !== 'ALL') trades = trades.filter(t => t.transaction_type === dirFilter);
    if (tickerFilter !== 'ALL') trades = trades.filter(t => t.target_ticker === tickerFilter);
    return trades;
  }, [dirFilter, tickerFilter]);

  // Summaries
  const summaries = useMemo(() => {
    const s = computeSummaries(filteredTrades);
    s.sort((a, b) => {
      const va = a[summarySort.field as keyof TickerSummary];
      const vb = b[summarySort.field as keyof TickerSummary];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb : String(va).localeCompare(String(vb));
      return summarySort.dir === 'asc' ? cmp : -cmp;
    });
    return s;
  }, [filteredTrades, summarySort]);

  // Sorted trades
  const sortedTrades = useMemo(() => {
    const trades = [...filteredTrades];
    trades.sort((a, b) => {
      const va = a[tradeSort.field as keyof InsiderTrade];
      const vb = b[tradeSort.field as keyof InsiderTrade];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb : String(va).localeCompare(String(vb));
      return tradeSort.dir === 'asc' ? cmp : -cmp;
    });
    return trades;
  }, [filteredTrades, tradeSort]);

  const toggleSummarySort = (field: string) => {
    setSummarySort(s => ({
      field,
      dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleTradeSort = (field: string) => {
    setTradeSort(s => ({
      field,
      dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {/* Header bar */}
      <header style={STYLES.header}>
        <span style={{ color: '#ff8c00', fontWeight: 700, fontSize: 12, letterSpacing: 1, marginRight: 12 }}>
          內線 NEIXIAN
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => { navigate('/'); }} style={{
            background: 'transparent', border: '1px solid #333', color: '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>TERM</button>
          <button style={{
            background: '#1a1a1a', border: '1px solid #ff8c00', color: '#ff8c00',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>SCRN</button>
          <button onClick={() => navigate('/heatmap')} style={{
            background: 'transparent', border: '1px solid #333', color: '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>HTMP</button>
          <button onClick={() => navigate('/treemap')} style={{
            background: 'transparent', border: '1px solid #333', color: '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>TRMP</button>
        </div>
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: 9 }}>
          {today.replace(/-/g, '/')}
          <span style={{ color: '#0c6', marginLeft: 6 }}>●</span> NY
        </span>
      </header>

      {/* Filter bar */}
      <div style={{
        height: 34, background: '#0a0a0a', borderBottom: '1px solid #1f1f1f',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 12,
        flexShrink: 0,
      }}>
        {/* Direction filter */}
        <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
          DIR:
        </span>
        <FilterBtn active={dirFilter === 'ALL'} color="#ff8c00" onClick={() => setDirFilter('ALL')}>
          ALL
        </FilterBtn>
        <FilterBtn active={dirFilter === 'BUY'} color="#0c6" onClick={() => setDirFilter('BUY')}>
          🟢 BUY
        </FilterBtn>
        <FilterBtn active={dirFilter === 'SELL'} color="#f33" onClick={() => setDirFilter('SELL')}>
          🔴 SELL
        </FilterBtn>

        {/* Ticker dropdown */}
        <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono, monospace', marginLeft: 8, whiteSpace: 'nowrap' }}>
          TICKER:
        </span>
        <select value={tickerFilter} onChange={e => setTickerFilter(e.target.value)} style={{
          background: '#1a1a1a', border: '1px solid #333', color: '#ff8c00',
          fontSize: 9, fontFamily: 'JetBrains Mono, monospace', padding: '2px 6px',
          borderRadius: 2, outline: 'none', cursor: 'pointer', maxWidth: 90,
        }}>
          {uniqueTickers.map(t => (
            <option key={t} value={t} style={{ background: '#1a1a1a', color: t === 'ALL' ? '#ff8c00' : '#e6e6e6' }}>
              {t}
            </option>
          ))}
        </select>

        {/* View mode toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button onClick={() => setViewMode('SUMMARY')} style={{
            background: viewMode === 'SUMMARY' ? '#1a1a1a' : 'transparent',
            border: `1px solid ${viewMode === 'SUMMARY' ? '#ff8c00' : '#333'}`,
            color: viewMode === 'SUMMARY' ? '#ff8c00' : '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>SUMMARY</button>
          <button onClick={() => setViewMode('TRADES')} style={{
            background: viewMode === 'TRADES' ? '#1a1a1a' : 'transparent',
            border: `1px solid ${viewMode === 'TRADES' ? '#ff8c00' : '#333'}`,
            color: viewMode === 'TRADES' ? '#ff8c00' : '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>TRADES</button>
        </div>
      </div>

      {/* Data area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {viewMode === 'SUMMARY' ? (
          <>
            {/* Summary header */}
            <Row>
              <SortHeader w={65} color="#555" field="ticker" currentSort={summarySort} onSort={toggleSummarySort} label="TICKER" />
              <SortHeader w={130} color="#555" field="company" currentSort={summarySort} onSort={toggleSummarySort} label="COMPANY" />
              <SortHeader w={42} color="#555" field="buyCount" currentSort={summarySort} onSort={toggleSummarySort} label="B" right />
              <SortHeader w={42} color="#555" field="sellCount" currentSort={summarySort} onSort={toggleSummarySort} label="S" right />
              <SortHeader w={72} color="#555" field="buyValue" currentSort={summarySort} onSort={toggleSummarySort} label="BUY $" right />
              <SortHeader w={72} color="#555" field="sellValue" currentSort={summarySort} onSort={toggleSummarySort} label="SELL $" right />
              <SortHeader w={72} color="#555" field="netValue" currentSort={summarySort} onSort={toggleSummarySort} label="NET" right />
              <SortHeader w={52} color="#555" field="signal" currentSort={summarySort} onSort={toggleSummarySort} label="SIGNAL" right />
              <SortHeader w={70} color="#555" field="lastDate" currentSort={summarySort} onSort={toggleSummarySort} label="LAST" />
            </Row>
            {/* Summary rows */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {summaries.map((s, i) => {
                const netColor = s.netValue >= 0 ? '#0c6' : '#f33';
                return (
                  <Row key={s.ticker} h={i % 2 === 0}>
                    <Cell w={65} color="#ff8c00" bold>{s.ticker}</Cell>
                    <Cell w={130} color="#e6e6e6">{truncate(s.company, 20)}</Cell>
                    <RCell w={42} c="#0c6">{s.buyCount}</RCell>
                    <RCell w={42} c="#f33">{s.sellCount}</RCell>
                    <RCell w={72} c="#0c6">{formatCurrency(s.buyValue)}</RCell>
                    <RCell w={72} c="#f33">{formatCurrency(s.sellValue)}</RCell>
                    <RCell w={72} c={netColor} b>{formatCurrency(s.netValue)}</RCell>
                    <RCell w={52} c="#e6e6e6"><SignalBadge score={s.signal} /></RCell>
                    <Cell w={70} color="#888">{formatDate(s.lastDate)}</Cell>
                  </Row>
                );
              })}
              {summaries.length === 0 && (
                <div style={{ color: '#555', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: 40 }}>
                  NO MATCHING RECORDS
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Trades header */}
            <Row>
              <SortHeader w={68} color="#555" field="transaction_date" currentSort={tradeSort} onSort={toggleTradeSort} label="DATE" />
              <SortHeader w={58} color="#555" field="target_ticker" currentSort={tradeSort} onSort={toggleTradeSort} label="TICKER" />
              <SortHeader w={105} color="#555" field="insider_name" currentSort={tradeSort} onSort={toggleTradeSort} label="INSIDER" />
              <SortHeader w={130} color="#555" field="insider_title" currentSort={tradeSort} onSort={toggleTradeSort} label="TITLE" />
              <SortHeader w={38} color="#555" field="transaction_type" currentSort={tradeSort} onSort={toggleTradeSort} label="DIR" right />
              <SortHeader w={60} color="#555" field="shares" currentSort={tradeSort} onSort={toggleTradeSort} label="SHARES" right />
              <SortHeader w={58} color="#555" field="price_per_share" currentSort={tradeSort} onSort={toggleTradeSort} label="PRICE" right />
              <SortHeader w={72} color="#555" field="total_value" currentSort={tradeSort} onSort={toggleTradeSort} label="VALUE" right />
            </Row>
            {/* Trade rows */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {sortedTrades.map((t, i) => {
                const isBuy = t.transaction_type === 'BUY';
                return (
                  <Row key={t.id} h={i % 2 === 0}>
                    <Cell w={68} color="#888">{formatDate(t.transaction_date)}</Cell>
                    <Cell w={58} color="#ff8c00" bold>{t.target_ticker}</Cell>
                    <Cell w={105} color="#e6e6e6">{truncate(t.insider_name, 16)}</Cell>
                    <Cell w={130} color="#888">{truncate(t.insider_title, 20)}</Cell>
                    <RCell w={38} c={isBuy ? '#0c6' : '#f33'} b>
                      {isBuy ? 'B' : 'S'}
                    </RCell>
                    <RCell w={60} c="#e6e6e6">{t.shares.toLocaleString()}</RCell>
                    <RCell w={58} c="#e6e6e6">${t.price_per_share.toFixed(2)}</RCell>
                    <RCell w={72} c={isBuy ? '#0c6' : '#f33'} b>{formatCurrency(t.total_value)}</RCell>
                  </Row>
                );
              })}
              {sortedTrades.length === 0 && (
                <div style={{ color: '#555', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: 40 }}>
                  NO MATCHING RECORDS
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={STYLES.footer}>
        <span>
          SCREENER | {viewMode === 'SUMMARY' ? summaries.length : sortedTrades.length} {
            viewMode === 'SUMMARY' ? 'TICKERS' : 'TRADES'
          } | {dirFilter === 'ALL' ? 'ALL' : dirFilter === 'BUY' ? 'BUY ONLY' : 'SELL ONLY'}
          {tickerFilter !== 'ALL' ? ` | ${tickerFilter}` : ''}
        </span>
        <span style={{ marginLeft: 'auto' }}>{today} | v0.2.0</span>
      </div>
    </div>
  );
}
