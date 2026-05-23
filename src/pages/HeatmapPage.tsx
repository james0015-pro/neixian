import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InsiderTrade } from '@/types/insider';
import { formatCurrency } from '@/lib/utils';

import insiderTradesRaw from '@/data/insider-trades.json';

const ALL_TRADES: InsiderTrade[] = insiderTradesRaw as InsiderTrade[];

// ─── Constants ────────────────────────────────────────────────
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

type HeatmapMode = 'SIGNAL' | 'NET_FLOW' | 'VOLUME';

// ─── Ticker Summary Computation ────────────────────────────────

interface TickerHeatData {
  ticker: string;
  company: string;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
  totalTrades: number;
  signal: number;       // 0-100
}

function computeHeatData(trades: InsiderTrade[]): TickerHeatData[] {
  const map = new Map<string, {
    company: string; buys: number; sells: number;
    buyVal: number; sellVal: number;
  }>();
  for (const t of trades) {
    const key = t.target_ticker;
    if (!map.has(key)) {
      map.set(key, { company: t.target_company, buys: 0, sells: 0, buyVal: 0, sellVal: 0 });
    }
    const e = map.get(key)!;
    if (t.transaction_type === 'BUY') { e.buys++; e.buyVal += t.total_value; }
    else { e.sells++; e.sellVal += t.total_value; }
  }

  return [...map.entries()].map(([ticker, d]) => {
    const total = d.buys + d.sells;
    const netVal = d.buyVal - d.sellVal;
    const buyRatio = total > 0 ? d.buys / total : 0;
    const volumeScore = Math.min(1, (d.buyVal + d.sellVal) / 1_000_000) * 15;
    const signal = Math.round(Math.min(100, buyRatio * 70 + volumeScore + (netVal > 0 ? 15 : 0)));
    return {
      ticker, company: d.company,
      buyCount: d.buys, sellCount: d.sells,
      buyValue: d.buyVal, sellValue: d.sellVal,
      netValue: netVal, totalTrades: total,
      signal,
    };
  });
}

// ─── Color Scale Helpers ───────────────────────────────────────

function signalColor(score: number): string {
  if (score >= 70) return '#008844';
  if (score >= 55) return '#00aa44';
  if (score >= 40) return '#66cc88';
  if (score >= 25) return '#ffaa44';
  if (score >= 15) return '#ff7722';
  return '#e53935';
}

function signalBgColor(score: number): string {
  if (score >= 70) return '#003322';
  if (score >= 55) return '#002211';
  if (score >= 40) return '#112211';
  if (score >= 25) return '#221100';
  if (score >= 15) return '#221100';
  return '#220000';
}

function flowColor(netValue: number, maxAbs: number): string {
  if (maxAbs === 0) return '#333';
  const ratio = netValue / maxAbs; // -1 to 1
  if (ratio > 0.7) return '#008844';
  if (ratio > 0.4) return '#00aa44';
  if (ratio > 0.1) return '#66cc88';
  if (ratio > -0.1) return '#666666';
  if (ratio > -0.4) return '#ff7722';
  if (ratio > -0.7) return '#cc3333';
  return '#e53935';
}

function volumeColor(count: number, maxCount: number): string {
  if (maxCount === 0) return '#333';
  const ratio = count / maxCount;
  if (ratio > 0.8) return '#ff8c00';
  if (ratio > 0.6) return '#cc6600';
  if (ratio > 0.4) return '#994400';
  if (ratio > 0.2) return '#663300';
  return '#332200';
}

// ─── Tile Component ────────────────────────────────────────────

function HeatTile({ data, mode, cellSize, maxAbsNet, maxVolume, onClick }: {
  data: TickerHeatData; mode: HeatmapMode; cellSize: number; maxAbsNet: number; maxVolume: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  let tileColor: string;
  let textColor: string;
  let subText: string;

  if (mode === 'SIGNAL') {
    tileColor = signalBgColor(data.signal);
    textColor = signalColor(data.signal);
    subText = `${data.signal}`;
  } else if (mode === 'NET_FLOW') {
    tileColor = '#0a0a0a';
    textColor = flowColor(data.netValue, maxAbsNet);
    subText = formatCurrency(data.netValue);
  } else {
    tileColor = '#0a0a0a';
    textColor = volumeColor(data.totalTrades, maxVolume);
    subText = `${data.totalTrades}`;
  }

  const borderColor = hovered ? '#ff8c00' : (mode === 'SIGNAL' ? signalColor(data.signal) + '44' : '#1f1f1f');

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: cellSize, height: cellSize,
        background: tileColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 3,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        zIndex: hovered ? 2 : 1,
        transition: 'transform 0.1s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left edge accent for signal mode */}
      {mode === 'SIGNAL' && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: 3, background: signalColor(data.signal),
        }} />
      )}
      {/* Ticker */}
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: cellSize >= 80 ? 13 : cellSize >= 60 ? 11 : 9,
        fontWeight: 700, color: textColor, lineHeight: 1,
      }}>
        {data.ticker}
      </span>
      {/* Sub-value */}
      {cellSize >= 60 && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: cellSize >= 80 ? 10 : 8,
          color: textColor, opacity: 0.8, marginTop: 2,
        }}>
          {subText}
        </span>
      )}
      {/* Hover detail tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: -2, left: 2, right: 2,
          background: 'rgba(0,0,0,0.9)', border: '1px solid #ff8c00',
          borderRadius: 2, padding: '2px 6px',
          fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
          color: '#e6e6e6', whiteSpace: 'nowrap', overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          <span style={{ color: '#0c6' }}>{data.buyCount}B</span>/
          <span style={{ color: '#f33' }}>{data.sellCount}S</span>
          {' '}{formatCurrency(data.netValue)}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

export default function HeatmapPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<HeatmapMode>('SIGNAL');
  const [cellSize, setCellSize] = useState(80);

  const today = new Date().toISOString().slice(0, 10);

  const heatData = useMemo(() => computeHeatData(ALL_TRADES), []);

  const maxAbsNet = useMemo(
    () => Math.max(...heatData.map(d => Math.abs(d.netValue)), 1),
    [heatData],
  );
  const maxVolume = useMemo(
    () => Math.max(...heatData.map(d => d.totalTrades), 1),
    [heatData],
  );

  const handleTileClick = useCallback((ticker: string) => {
    // F016 not built yet — show alert for now
    navigate(`/stocks/${ticker}`);
  }, [navigate]);

  // Color legend items
  const legendItems = mode === 'SIGNAL' ? [
    { label: 'STRONG BUY', color: '#008844', range: '70-100' },
    { label: 'BUY', color: '#00aa44', range: '55-69' },
    { label: 'NEUTRAL+', color: '#66cc88', range: '40-54' },
    { label: 'CAUTION', color: '#ffaa44', range: '25-39' },
    { label: 'WARNING', color: '#ff7722', range: '15-24' },
    { label: 'SELL', color: '#e53935', range: '0-14' },
  ] : mode === 'NET_FLOW' ? [
    { label: 'STRONG IN', color: '#008844', range: '>70%' },
    { label: 'IN', color: '#00aa44', range: '40-70%' },
    { label: 'SLIGHT IN', color: '#66cc88', range: '10-40%' },
    { label: 'NEUTRAL', color: '#666666', range: '±10%' },
    { label: 'SLIGHT OUT', color: '#ff7722', range: '-10~-40%' },
    { label: 'OUT', color: '#e53935', range: '<-40%' },
  ] : [
    { label: 'VERY HIGH', color: '#ff8c00', range: '>80%' },
    { label: 'HIGH', color: '#cc6600', range: '60-80%' },
    { label: 'MEDIUM', color: '#994400', range: '40-60%' },
    { label: 'LOW', color: '#663300', range: '20-40%' },
    { label: 'MINIMAL', color: '#332200', range: '<20%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#000', overflow: 'hidden' }}>
      {/* Header bar */}
      <header style={STYLES.header}>
        <span style={{ color: '#ff8c00', fontWeight: 700, fontSize: 12, letterSpacing: 1, marginRight: 12 }}>
          內線 NEIXIAN
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => navigate('/')} style={{
            background: 'transparent', border: '1px solid #333', color: '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>TERM</button>
          <button onClick={() => navigate('/screener')} style={{
            background: 'transparent', border: '1px solid #333', color: '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>SCRN</button>
          <button style={{
            background: '#1a1a1a', border: '1px solid #ff8c00', color: '#ff8c00',
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

      {/* Mode selector + size slider */}
      <div style={{
        height: 34, background: '#0a0a0a', borderBottom: '1px solid #1f1f1f',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 10,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
          MODE:
        </span>
        {(['SIGNAL', 'NET_FLOW', 'VOLUME'] as HeatmapMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            background: mode === m ? '#1a1a1a' : 'transparent',
            border: `1px solid ${mode === m ? '#ff8c00' : '#333'}`,
            color: mode === m ? '#ff8c00' : '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>{m.replace('_', ' ')}</button>
        ))}

        <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', marginLeft: 8, whiteSpace: 'nowrap' }}>
          SIZE:
        </span>
        <input type="range" min={40} max={120} step={10} value={cellSize}
          onChange={e => setCellSize(Number(e.target.value))}
          style={{ width: 100, accentColor: '#ff8c00' }}
        />
        <span style={{ fontSize: 9, color: '#888', fontFamily: 'JetBrains Mono' }}>
          {cellSize}px
        </span>

        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {legendItems.map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2,
                background: item.color, display: 'inline-block',
              }} />
              <span style={{ fontSize: 7, color: '#888', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
                {item.range}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div style={{
        flex: 1, overflow: 'auto', padding: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          justifyContent: 'center', alignContent: 'center',
          maxWidth: cellSize * 6 + 100,
        }}>
          {heatData.map(d => (
            <HeatTile key={d.ticker} data={d} mode={mode} cellSize={cellSize}
              maxAbsNet={maxAbsNet} maxVolume={maxVolume}
              onClick={() => handleTileClick(d.ticker)}
            />
          ))}
          {heatData.length === 0 && (
            <div style={{
              color: '#555', fontSize: 11, fontFamily: 'JetBrains Mono',
              textAlign: 'center', padding: 40,
            }}>
              NO DATA AVAILABLE
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={STYLES.footer}>
        <span>
          HEATMAP | {heatData.length} TICKERS | MODE: {mode.replace('_', ' ')}
        </span>
        <span style={{ marginLeft: 'auto' }}>{today} | v0.2.0</span>
      </div>
    </div>
  );
}
