import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InsiderTrade } from '@/types/insider';
import type { InstitutionHolding } from '@/types/institution';
import { formatCurrency, formatDate, formatPercent, truncate } from '@/lib/utils';
import ChartPanel from '@/components/ChartPanel';

// Mock data import — will be replaced with real data later
import insiderTradesRaw from '@/data/insider-trades.json';
import institutionHoldingsRaw from '@/data/institution-holdings.json';

const ALL_TRADES: InsiderTrade[] = insiderTradesRaw as InsiderTrade[];
const ALL_HOLDINGS: InstitutionHolding[] = institutionHoldingsRaw as InstitutionHolding[];

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
  panelHeader: {
    height: 22, background: '#0a0a0a', borderBottom: '1px solid #1f1f1f',
    display: 'flex', alignItems: 'center', padding: '0 8px',
    fontSize: 10, color: '#ff8c00', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: 1,
    fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
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

// ─── Insider Timeline (Q2 detail) ──────────────────────────────

function InsiderTimeline({ insiderName }: { insiderName: string }) {
  const allTrades = ALL_TRADES
    .filter(t => t.insider_name === insiderName)
    .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));

  if (allTrades.length === 0) {
    return <div style={{ color: '#555', fontSize: 10, fontStyle: 'italic' }}>No trade history found.</div>;
  }

  // Summary stats
  const buys = allTrades.filter(t => t.transaction_type === 'BUY');
  const sells = allTrades.filter(t => t.transaction_type === 'SELL');
  const totalBuyVal = buys.reduce((s, t) => s + t.total_value, 0);
  const totalSellVal = sells.reduce((s, t) => s + t.total_value, 0);
  const netVal = totalBuyVal - totalSellVal;
  const dateFirst = allTrades[allTrades.length - 1].transaction_date.slice(0, 10);
  const dateLast = allTrades[0].transaction_date.slice(0, 10);

  // Group by ticker
  const groups = new Map<string, InsiderTrade[]>();
  for (const t of allTrades) {
    const key = t.target_ticker;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const tickerLabel = (ticker: string) => {
    const sample = allTrades.find(t => t.target_ticker === ticker);
    return sample ? `${ticker} — ${truncate(sample.target_company, 18)}` : ticker;
  };

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
      {/* Section header */}
      <div style={{
        fontSize: 9, color: '#555', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: 1,
        borderBottom: '1px solid #1f1f1f', paddingBottom: 4,
      }}>
        INSIDER HISTORY
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap',
        marginBottom: 8, padding: '4px 6px',
        background: '#0a0a0a', border: '1px solid #1f1f1f',
        borderRadius: 2,
      }}>
        <span style={{ color: '#888' }}>
          <span style={{ color: '#e6e6e6', fontWeight: 600 }}>{allTrades.length}</span> trades
        </span>
        <span style={{ color: '#888' }}>
          <span style={{ color: '#0c6' }}>{buys.length}B</span>·
          <span style={{ color: '#f33' }}>{sells.length}S</span>
        </span>
        <span style={{ color: '#888' }}>
          NET <span style={{
            color: netVal >= 0 ? '#0c6' : '#f33', fontWeight: 600,
          }}>{formatCurrency(Math.abs(netVal))}</span>
        </span>
        <span style={{ color: '#555', fontSize: 9 }}>
          {dateFirst} → {dateLast}
        </span>
      </div>

      {/* Ticker groups */}
      {[...groups.entries()].map(([ticker, trades]) => {
        const gBuys = trades.filter(t => t.transaction_type === 'BUY');
        const gSells = trades.filter(t => t.transaction_type === 'SELL');
        const gNet = gBuys.reduce((s, t) => s + t.total_value, 0) -
                      gSells.reduce((s, t) => s + t.total_value, 0);

        return (
          <div key={ticker} style={{ marginBottom: 8 }}>
            {/* Ticker group header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '3px 6px', marginBottom: 2,
              background: 'rgba(255,140,0,0.06)',
              borderLeft: '2px solid #ff8c00',
            }}>
              <span style={{ color: '#ff8c00', fontWeight: 700, fontSize: 10 }}>
                {ticker}
              </span>
              <span style={{ color: '#888', fontSize: 9 }}>
                {tickerLabel(ticker)}
              </span>
              <span style={{ marginLeft: 'auto', color: '#555', fontSize: 8 }}>
                {trades.length} trade{trades.length > 1 ? 's' : ''}
                {' — '}
                <span style={{ color: '#0c6' }}>{gBuys.length}B</span>/
                <span style={{ color: '#f33' }}>{gSells.length}S</span>
                {' — NET '}
                <span style={{
                  color: gNet >= 0 ? '#0c6' : '#f33', fontWeight: 600,
                }}>{formatCurrency(Math.abs(gNet))}</span>
              </span>
            </div>

            {/* Trade rows */}
            {trades.map((t, i) => {
              const isBuy = t.transaction_type === 'BUY';
              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '2px 6px', height: 20,
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                }}>
                  {/* Date */}
                  <span style={{ width: 50, color: '#888', fontSize: 9, flexShrink: 0 }}>
                    {t.transaction_date.slice(5, 10)}
                  </span>
                  {/* Direction badge */}
                  <span style={{
                    width: 26, textAlign: 'center', flexShrink: 0,
                    fontSize: 8, fontWeight: 700,
                    color: isBuy ? '#0c6' : '#f33',
                    border: `1px solid ${isBuy ? '#0c6' : '#f33'}44`,
                    borderRadius: 2, padding: '1px 3px',
                  }}>
                    {isBuy ? 'B' : 'S'}
                  </span>
                  {/* Value */}
                  <span style={{
                    width: 60, textAlign: 'right', flexShrink: 0,
                    color: isBuy ? '#0c6' : '#f33', fontWeight: 600,
                  }}>
                    {formatCurrency(t.total_value)}
                  </span>
                  {/* Shares */}
                  <span style={{ width: 52, textAlign: 'right', color: '#e6e6e6', fontSize: 9, flexShrink: 0 }}>
                    {t.shares.toLocaleString()} sh
                  </span>
                  {/* Price */}
                  <span style={{ width: 56, textAlign: 'right', color: '#888', fontSize: 9, flexShrink: 0 }}>
                    @${t.price_per_share.toFixed(0)}
                  </span>
                  {/* Held after */}
                  <span style={{ width: 58, textAlign: 'right', color: '#555', fontSize: 8, flexShrink: 0 }}>
                    held {t.shares_held_after.toLocaleString()}
                  </span>
                  {/* Filing */}
                  <span style={{ color: '#555', fontSize: 8, flexShrink: 0 }}>
                    filed {t.filing_date.slice(5, 10)}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedInsider, setSelectedInsider] = useState<InsiderTrade | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionHolding | null>(null);
  const [insiderSort, setInsiderSort] = useState<{ field: keyof InsiderTrade; dir: 'asc' | 'desc' }>({
    field: 'transaction_date', dir: 'desc',
  });
  const [instSort, setInstSort] = useState<{ field: keyof InstitutionHolding; dir: 'asc' | 'desc' }>({
    field: 'market_value', dir: 'desc',
  });
  const [insiderFilter, setInsiderFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [focusedQuad, setFocusedQuad] = useState<number>(0);
  const [search, setSearch] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  // Filter + sort insider trades
  const filteredTrades = useMemo(() => {
    let trades = [...ALL_TRADES];
    if (insiderFilter !== 'ALL') trades = trades.filter(t => t.transaction_type === insiderFilter);
    if (search) {
      const q = search.toUpperCase();
      trades = trades.filter(t =>
        t.target_ticker.includes(q) || t.insider_name.toUpperCase().includes(q) ||
        t.target_company.toUpperCase().includes(q) || t.source_company.toUpperCase().includes(q)
      );
    }
    trades.sort((a, b) => {
      const va = a[insiderSort.field], vb = b[insiderSort.field];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb : String(va).localeCompare(String(vb));
      return insiderSort.dir === 'asc' ? cmp : -cmp;
    });
    return trades;
  }, [insiderFilter, search, insiderSort]);

  // Sort institution holdings
  const sortedHoldings = useMemo(() => {
    const holdings = [...ALL_HOLDINGS];
    if (search) {
      const q = search.toUpperCase();
      return holdings.filter(h =>
        h.ticker.includes(q) || h.institution_name.toUpperCase().includes(q) || h.company_name.toUpperCase().includes(q)
      );
    }
    holdings.sort((a, b) => {
      const va = a[instSort.field], vb = b[instSort.field];
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb : String(va).localeCompare(String(vb));
      return instSort.dir === 'asc' ? cmp : -cmp;
    });
    return holdings;
  }, [search, instSort]);

  // Ticker tape (unique tickers)
  const tickers = useMemo(() => {
    const set = new Set(ALL_TRADES.map(t => t.target_ticker));
    return [...set].sort();
  }, []);

  // Keyboard nav
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') {
        setSelectedInsider(null);
        setSelectedInstitution(null);
        setSearch('');
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        setFocusedQuad(parseInt(e.key));
        if (e.key === '1') setInsiderFilter('ALL');
        if (e.key === '2') setInsiderFilter('BUY');
        if (e.key === '3') setInsiderFilter('SELL');
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        const inp = document.getElementById('cmd-input') as HTMLInputElement;
        inp?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const toggleInsiderSort = (field: keyof InsiderTrade) => {
    setInsiderSort(s => ({
      field,
      dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleInstSort = (field: keyof InstitutionHolding) => {
    setInstSort(s => ({
      field,
      dir: s.field === field && s.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortArrow = (field: string, currentSort: { field: string; dir: string }) =>
    currentSort.field === field ? (currentSort.dir === 'asc' ? ' ▴' : ' ▾') : '';

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {/* Top header bar */}
      <header style={STYLES.header}>
        <span style={{ color: '#ff8c00', fontWeight: 700, fontSize: 12, letterSpacing: 1, marginRight: 12 }}>
          內線 NEIXIAN
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{
            background: '#1a1a1a', border: '1px solid #ff8c00', color: '#ff8c00',
            cursor: 'default', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>TERM</button>
          <button onClick={() => navigate('/screener')} style={{
            background: 'transparent', border: '1px solid #333', color: '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>SCRN</button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            display: 'flex', whiteSpace: 'nowrap', gap: 24,
            animation: 'scroll-tape 40s linear infinite',
            fontSize: 10, color: '#888',
          }}>
            {[...tickers, ...tickers].map((t, i) => (
              <span key={i}>{t} <span style={{ color: '#0c6' }}>
                {ALL_TRADES.filter(x => x.target_ticker === t && x.transaction_type === 'BUY').length}B
              </span>/<span style={{ color: '#f33' }}>
                {ALL_TRADES.filter(x => x.target_ticker === t && x.transaction_type === 'SELL').length}S
              </span></span>
            ))}
          </div>
        </div>
        <input
          id="cmd-input"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH TICKER/INSIDER..."
          style={{
            background: '#1a1a1a', border: '1px solid #333', color: '#ff8c00',
            padding: '2px 8px', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
            width: 180, outline: 'none', borderRadius: 2,
          }}
        />
        <span style={{ color: '#555', fontSize: 9, marginLeft: 12 }}>
          {today.replace(/-/g, '/')}
          <span style={{ color: '#0c6', marginLeft: 6 }}>●</span> NY
        </span>
      </header>

      {/* Style for ticker tape */}
      <style>{`
        @keyframes scroll-tape {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* 4-Quadrant Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '3fr 2fr',
        gridTemplateRows: '1fr 1fr', flex: 1, overflow: 'hidden',
      }}>
        {/* Q1: Insider Trades Table */}
        <div style={{
          borderRight: `1px solid ${focusedQuad === 1 ? '#ff8c00' : '#1f1f1f'}`,
          borderBottom: '1px solid #1f1f1f',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={STYLES.panelHeader}>
            <span>Q1: INSIDER TRADES ({filteredTrades.length})</span>
            <span style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
              <FilterBtn active={insiderFilter === 'ALL'} color="#ff8c00" onClick={() => setInsiderFilter('ALL')}>ALL</FilterBtn>
              <FilterBtn active={insiderFilter === 'BUY'} color="#0c6" onClick={() => setInsiderFilter('BUY')}>B</FilterBtn>
              <FilterBtn active={insiderFilter === 'SELL'} color="#f33" onClick={() => setInsiderFilter('SELL')}>S</FilterBtn>
            </span>
          </div>
          {/* Header */}
          <Row>
            <Cell w={80} color="#555" bold onClick={() => toggleInsiderSort('insider_name')}>
              INSIDER{sortArrow('insider_name', insiderSort)}
            </Cell>
            <Cell w={75} color="#555" bold onClick={() => toggleInsiderSort('source_company')}>
              FROM{sortArrow('source_company', insiderSort)}
            </Cell>
            <Cell w={65} color="#555" bold onClick={() => toggleInsiderSort('target_ticker')}>
              TICKER{sortArrow('target_ticker', insiderSort)}
            </Cell>
            <Cell w={95} color="#555" bold onClick={() => toggleInsiderSort('target_company')}>
              TARGET{sortArrow('target_company', insiderSort)}
            </Cell>
            <RCell w={55} c="#555" b onClick={() => toggleInsiderSort('total_value')}>
              VALUE{sortArrow('total_value', insiderSort)}
            </RCell>
            <Cell w={55} color="#555" bold onClick={() => toggleInsiderSort('transaction_date')}>
              DATE{sortArrow('transaction_date', insiderSort)}
            </Cell>
            <RCell w={38} c={insiderFilter === 'BUY' ? '#0c6' : insiderFilter === 'SELL' ? '#f33' : '#555'} b>
              DIR ▾
            </RCell>
          </Row>
          {/* Data rows */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredTrades.slice(0, 200).map((t, i) => {
              const isBuy = t.transaction_type === 'BUY';
              return (
                <Row key={t.id} h={i % 2 === 0}>
                  <Cell w={80} color="#e6e6e6"
                    onClick={() => setSelectedInsider(t)}>{truncate(t.insider_name, 12)}</Cell>
                  <Cell w={75} color="#888">{truncate(t.source_company, 12)}</Cell>
                  <Cell w={65} color="#ff8c00" bold>{t.target_ticker}</Cell>
                  <Cell w={95} color="#888">{truncate(t.target_company, 15)}</Cell>
                  <RCell w={55} c={isBuy ? '#0c6' : '#f33'}>{formatCurrency(t.total_value)}</RCell>
                  <Cell w={55} color="#888">{formatDate(t.transaction_date)}</Cell>
                  <RCell w={38} c={isBuy ? '#0c6' : '#f33'} b>{isBuy ? 'BUY' : 'SEL'}</RCell>
                </Row>
              );
            })}
          </div>
        </div>

        {/* Q2: Detail Panel */}
        <div style={{
          borderBottom: '1px solid #1f1f1f',
          borderLeft: focusedQuad === 2 ? '1px solid #ff8c00' : undefined,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={STYLES.panelHeader}>
            Q2: DETAIL
            <span style={{ marginLeft: 'auto', fontSize: 9, color: '#555' }}>
              {selectedInsider ? 'INSIDER' : selectedInstitution ? 'INST' : 'NONE'}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
            {selectedInsider ? (
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                <div style={{ color: '#ff8c00', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  {selectedInsider.insider_name}
                </div>
                <div style={{ color: '#e6e6e6', marginBottom: 2 }}>{selectedInsider.insider_title}</div>
                <div style={{ color: '#888', marginBottom: 8 }}>
                  {selectedInsider.source_company} → BUYS {selectedInsider.target_ticker} ({selectedInsider.target_company})
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12,
                  background: '#0a0a0a', border: '1px solid #1f1f1f', padding: 8,
                }}>
                  <div><span style={{ color: '#555' }}>TYPE</span><br />
                    <span style={{ color: selectedInsider.transaction_type === 'BUY' ? '#0c6' : '#f33', fontWeight: 700 }}>
                      {selectedInsider.transaction_type}
                    </span></div>
                  <div><span style={{ color: '#555' }}>SHARES</span><br />
                    <span style={{ color: '#e6e6e6' }}>{selectedInsider.shares.toLocaleString()}</span></div>
                  <div><span style={{ color: '#555' }}>PRICE</span><br />
                    <span style={{ color: '#e6e6e6' }}>${selectedInsider.price_per_share.toFixed(2)}</span></div>
                  <div><span style={{ color: '#555' }}>VALUE</span><br />
                    <span style={{
                      color: selectedInsider.transaction_type === 'BUY' ? '#0c6' : '#f33', fontWeight: 700,
                    }}>{formatCurrency(selectedInsider.total_value)}</span></div>
                  <div><span style={{ color: '#555' }}>HELD AFTER</span><br />
                    <span style={{ color: '#e6e6e6' }}>{selectedInsider.shares_held_after.toLocaleString()}</span></div>
                  <div><span style={{ color: '#555' }}>FILED</span><br />
                    <span style={{ color: '#888' }}>{selectedInsider.filing_date}</span></div>
                </div>
                {/* Price chart for the traded ticker */}
                <div style={{ fontSize: 9, color: '#555', marginBottom: 4, textTransform: 'uppercase' }}>
                  {selectedInsider.target_ticker} PRICE CHART (90D)
                </div>
                <ChartPanel ticker={selectedInsider.target_ticker} />
                <InsiderTimeline insiderName={selectedInsider.insider_name} />
              </div>
            ) : selectedInstitution ? (
              <div style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
                <div style={{ color: '#ff8c00', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  {selectedInstitution.institution_name}
                </div>
                <div style={{ color: '#888', marginBottom: 8 }}>
                  {selectedInstitution.ticker} · {selectedInstitution.company_name}
                </div>
                <div style={{
                  background: '#0a0a0a', border: '1px solid #1f1f1f', padding: 8,
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
                }}>
                  <div><span style={{ color: '#555' }}>VALUE</span><br />
                    <span style={{ color: '#e6e6e6' }}>{formatCurrency(selectedInstitution.market_value)}</span></div>
                  <div><span style={{ color: '#555' }}>CHANGE QoQ</span><br />
                    <span style={{ color: selectedInstitution.change_qoq >= 0 ? '#0c6' : '#f33' }}>
                      {formatPercent(selectedInstitution.change_qoq)}
                    </span></div>
                  <div><span style={{ color: '#555' }}>WEIGHT</span><br />
                    <span style={{ color: '#e6e6e6' }}>{selectedInstitution.portfolio_weight.toFixed(2)}%</span></div>
                  <div><span style={{ color: '#555' }}>REPORT</span><br />
                    <span style={{ color: '#888' }}>{selectedInstitution.report_date}</span></div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#555', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', marginTop: 40 }}>
                CLICK ANY ROW IN Q1 OR Q3<br />TO VIEW DETAILS
                <div style={{ marginTop: 12, fontSize: 9 }}>
                  1-4 SWITCH QUAD · ESC CLEAR · / SEARCH
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Q3: Institution Rankings */}
        <div style={{
          borderRight: `1px solid ${focusedQuad === 3 ? '#ff8c00' : '#1f1f1f'}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={STYLES.panelHeader}>
            <span>Q3: INSTITUTION HOLDINGS ({sortedHoldings.length})</span>
          </div>
          {/* Header */}
          <Row>
            <Cell w={130} color="#555" bold onClick={() => toggleInstSort('institution_name')}>
              INSTITUTION{sortArrow('institution_name', instSort)}
            </Cell>
            <Cell w={55} color="#555" bold onClick={() => toggleInstSort('ticker')}>
              TICK{sortArrow('ticker', instSort)}
            </Cell>
            <RCell w={65} c="#555" b onClick={() => toggleInstSort('market_value')}>
              VALUE{sortArrow('market_value', instSort)}
            </RCell>
            <RCell w={55} c="#555" b onClick={() => toggleInstSort('change_qoq')}>
              Δ QoQ{sortArrow('change_qoq', instSort)}
            </RCell>
            <RCell w={55} c="#555" b>
              WEIGHT%
            </RCell>
            <Cell w={72} color="#555" bold onClick={() => toggleInstSort('report_date')}>
              REPORT{sortArrow('report_date', instSort)}
            </Cell>
          </Row>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {sortedHoldings.slice(0, 200).map((h, i) => (
              <Row key={h.id} h={i % 2 === 0}>
                <Cell w={130} color="#e6e6e6"
                  onClick={() => setSelectedInstitution(h)}>{truncate(h.institution_name, 20)}</Cell>
                <Cell w={55} color="#ff8c00" bold>{h.ticker}</Cell>
                <RCell w={65} c="#e6e6e6">{formatCurrency(h.market_value)}</RCell>
                <RCell w={55} c={h.change_qoq >= 0 ? '#0c6' : '#f33'} b>
                  {formatPercent(h.change_qoq)}
                </RCell>
                <RCell w={55} c="#888">{h.portfolio_weight.toFixed(2)}%</RCell>
                <Cell w={72} color="#888">{h.report_date}</Cell>
              </Row>
            ))}
          </div>
        </div>

        {/* Q4: Stats / Commands */}
        <div style={{
          borderLeft: focusedQuad === 4 ? '1px solid #ff8c00' : undefined,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={STYLES.panelHeader}>
            Q4: SUMMARY
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 10, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
            <div style={{ color: '#ff8c00', fontWeight: 700, marginBottom: 8, fontSize: 9, textTransform: 'uppercase' }}>
              MARKET SNAPSHOT
            </div>
            {(() => {
              const buys = ALL_TRADES.filter(t => t.transaction_type === 'BUY');
              const sells = ALL_TRADES.filter(t => t.transaction_type === 'SELL');
              const totalBuyVal = buys.reduce((s, t) => s + t.total_value, 0);
              const totalSellVal = sells.reduce((s, t) => s + t.total_value, 0);
              const uniqueInsiders = new Set(ALL_TRADES.map(t => t.insider_name)).size;
              const uniqueTickers = new Set(ALL_TRADES.map(t => t.target_ticker)).size;
              const uniqueInsts = new Set(ALL_HOLDINGS.map(h => h.institution_name)).size;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <StatRow label="TOTAL TRADES" value={ALL_TRADES.length.toLocaleString()} color="#e6e6e6" />
                  <StatRow label="BUYS" value={buys.length.toString()} color="#0c6" />
                  <StatRow label="SELLS" value={sells.length.toString()} color="#f33" />
                  <StatRow label="TOTAL BUY $" value={formatCurrency(totalBuyVal)} color="#0c6" />
                  <StatRow label="TOTAL SELL $" value={formatCurrency(totalSellVal)} color="#f33" />
                  <StatRow label="NET FLOW" value={formatCurrency(totalBuyVal - totalSellVal)}
                    color={totalBuyVal >= totalSellVal ? '#0c6' : '#f33'} />
                  <div style={{ borderTop: '1px solid #1f1f1f', margin: '4px 0' }} />
                  <StatRow label="UNIQUE INSIDERS" value={uniqueInsiders.toString()} color="#ff8c00" />
                  <StatRow label="UNIQUE TICKERS" value={uniqueTickers.toString()} color="#ff8c00" />
                  <StatRow label="INSTITUTIONS" value={uniqueInsts.toString()} color="#ff8c00" />
                  <StatRow label="TOTAL INST $" value={formatCurrency(ALL_HOLDINGS.reduce((s, h) => s + h.market_value, 0))} color="#e6e6e6" />
                  <div style={{ borderTop: '1px solid #1f1f1f', margin: '4px 0' }} />
                  <div style={{ color: '#555', fontSize: 8, marginTop: 4 }}>
                    1=ALL 2=BUY 3=SELL 4=STATS<br />
                    ↑↓ SCROLL · ENTER DETAIL<br />
                    ESC CLEAR · / SEARCH
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={STYLES.footer}>
        <span>NEIXIAN/INSIDER | {ALL_TRADES.length} TRADES | {ALL_HOLDINGS.length} INST HOLDINGS</span>
        <span style={{ marginLeft: 'auto' }}>{today} | v0.1.0</span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

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
    }}>{children}</button>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#555', fontSize: 9 }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontSize: 10 }}>{value}</span>
    </div>
  );
}
