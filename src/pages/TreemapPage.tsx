import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InsiderTrade } from '@/types/insider';
import { formatCurrency, truncate } from '@/lib/utils';

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

type TreemapMode = 'INSIDER_NET' | 'BUY_RATIO' | 'TOTAL_VALUE';

// ─── Data Computation ──────────────────────────────────────────

interface TileData {
  ticker: string;
  company: string;
  buyCount: number;
  sellCount: number;
  buyValue: number;
  sellValue: number;
  netValue: number;
  totalValue: number;
  signal: number;
}

function computeTileData(trades: InsiderTrade[]): TileData[] {
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
    const signal = Math.round(Math.min(100, buyRatio * 70 + Math.min(1, (d.buyVal + d.sellVal) / 1_000_000) * 15 + (netVal > 0 ? 15 : 0)));
    return {
      ticker, company: d.company,
      buyCount: d.buys, sellCount: d.sells,
      buyValue: d.buyVal, sellValue: d.sellVal,
      netValue: netVal, totalValue: d.buyVal + d.sellVal,
      signal,
    };
  });
}

// ─── Treemap Layout (squarified, simplified) ───────────────────

interface TileRect {
  x: number; y: number; w: number; h: number;
}

function computeTreemapLayout(data: TileData[], width: number, height: number): (TileData & TileRect)[] {
  if (data.length === 0) return [];

  // Sort by total value descending
  const sorted = [...data].sort((a, b) => b.totalValue - a.totalValue);
  const totalVal = sorted.reduce((s, d) => s + Math.max(d.totalValue, 1), 0);
  const area = width * height;
  const scaleFactor = area / totalVal;

  // Simple grid layout: cols proportional to aspect ratio
  const cols = Math.max(3, Math.min(6, Math.ceil(Math.sqrt(data.length * (width / height)))));
  const rows = Math.ceil(data.length / cols);
  const cellW = width / cols;
  const cellH = height / rows;

  return sorted.map((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      ...d,
      x: col * cellW,
      y: row * cellH,
      w: cellW - 2,
      h: cellH - 2,
    };
  });
}

// ─── Color Helpers ─────────────────────────────────────────────

function netColor(netValue: number, maxAbs: number): string {
  if (maxAbs === 0) return '#333';
  const ratio = netValue / maxAbs;
  if (ratio > 0.7) return '#008844';
  if (ratio > 0.4) return '#00aa44';
  if (ratio > 0.1) return '#338844';
  if (ratio > -0.1) return '#666666';
  if (ratio > -0.4) return '#883333';
  if (ratio > -0.7) return '#aa2222';
  return '#e53935';
}

function buyRatioColor(ratio: number): string {
  if (ratio >= 0.8) return '#008844';
  if (ratio >= 0.6) return '#00aa44';
  if (ratio >= 0.4) return '#338844';
  if (ratio >= 0.3) return '#666666';
  if (ratio >= 0.15) return '#883333';
  return '#e53935';
}

function valueColor(totalValue: number, maxVal: number): string {
  if (maxVal === 0) return '#333';
  const ratio = totalValue / maxVal;
  if (ratio > 0.8) return '#ff8c00';
  if (ratio > 0.6) return '#cc6600';
  if (ratio > 0.4) return '#993300';
  if (ratio > 0.2) return '#663300';
  return '#331100';
}

// ─── Main Page ─────────────────────────────────────────────────

export default function TreemapPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<TreemapMode>('INSIDER_NET');
  const [hovered, setHovered] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 900, h: 500 });

  const today = new Date().toISOString().slice(0, 10);

  const tileData = useMemo(() => {
    const d = computeTileData(ALL_TRADES);
    return d.filter(x => x.totalValue > 0); // skip zero-value
  }, []);

  const maxAbsNet = useMemo(
    () => Math.max(...tileData.map(d => Math.abs(d.netValue)), 1),
    [tileData],
  );

  const maxValue = useMemo(
    () => Math.max(...tileData.map(d => d.totalValue), 1),
    [tileData],
  );

  const layout = useMemo(
    () => computeTreemapLayout(tileData, dims.w, dims.h),
    [tileData, dims],
  );

  // Resize observer to fill container
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDims({
          w: entry.contentRect.width - 16, // padding
          h: entry.contentRect.height - 16,
        });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
          <button onClick={() => navigate('/heatmap')} style={{
            background: 'transparent', border: '1px solid #333', color: '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>HTMP</button>
          <button style={{
            background: '#1a1a1a', border: '1px solid #ff8c00', color: '#ff8c00',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>TRMP</button>
        </div>
        <span style={{ marginLeft: 'auto', color: '#555', fontSize: 9 }}>
          {today.replace(/-/g, '/')}
          <span style={{ color: '#0c6', marginLeft: 6 }}>●</span> NY
        </span>
      </header>

      {/* Mode selector */}
      <div style={{
        height: 34, background: '#0a0a0a', borderBottom: '1px solid #1f1f1f',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 10,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: '#555', fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap' }}>
          COLOR BY:
        </span>
        {([
          { key: 'INSIDER_NET' as TreemapMode, label: 'INSIDER NET FLOW' },
          { key: 'BUY_RATIO' as TreemapMode, label: 'BUY/SELL RATIO' },
          { key: 'TOTAL_VALUE' as TreemapMode, label: 'TOTAL VALUE' },
        ]).map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{
            background: mode === m.key ? '#1a1a1a' : 'transparent',
            border: `1px solid ${mode === m.key ? '#ff8c00' : '#333'}`,
            color: mode === m.key ? '#ff8c00' : '#888',
            cursor: 'pointer', fontSize: 9, padding: '2px 10px',
            fontFamily: 'JetBrains Mono, monospace', borderRadius: 2,
          }}>{m.label}</button>
        ))}

        {/* Legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {mode === 'INSIDER_NET' ? (
            <>
              <LegendDot color="#008844" label="NET BUY" />
              <LegendDot color="#666666" label="NEUTRAL" />
              <LegendDot color="#e53935" label="NET SELL" />
            </>
          ) : mode === 'BUY_RATIO' ? (
            <>
              <LegendDot color="#008844" label="≥80% BUY" />
              <LegendDot color="#666666" label="~30%" />
              <LegendDot color="#e53935" label="≤15% BUY" />
            </>
          ) : (
            <>
              <LegendDot color="#ff8c00" label="HIGH" />
              <LegendDot color="#993300" label="MED" />
              <LegendDot color="#331100" label="LOW" />
            </>
          )}
          <span style={{ fontSize: 8, color: '#555', fontFamily: 'JetBrains Mono', marginLeft: 4 }}>
            TILE SIZE = TRADE VOLUME
          </span>
        </div>
      </div>

      {/* Treemap SVG */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', padding: 8 }}>
        <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`}
          style={{ display: 'block' }}>
          {layout.map(tile => {
            const isHovered = hovered === tile.ticker;
            let tileColor: string;
            if (mode === 'INSIDER_NET') {
              tileColor = netColor(tile.netValue, maxAbsNet);
            } else if (mode === 'BUY_RATIO') {
              const ratio = tile.buyCount + tile.sellCount > 0
                ? tile.buyCount / (tile.buyCount + tile.sellCount) : 0;
              tileColor = buyRatioColor(ratio);
            } else {
              tileColor = valueColor(tile.totalValue, maxValue);
            }

            const fontSize = Math.min(12, Math.max(8, tile.w / 8));
            const showSub = tile.w > 80 && tile.h > 50;

            return (
              <g key={tile.ticker}
                onMouseEnter={() => setHovered(tile.ticker)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => navigate(`/stocks/${tile.ticker}`)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={tile.x} y={tile.y} width={tile.w} height={tile.h}
                  fill={tileColor} fillOpacity={isHovered ? 0.95 : 0.75}
                  stroke={isHovered ? '#ff8c00' : '#1f1f1f'}
                  strokeWidth={isHovered ? 2 : 1}
                  rx={isHovered ? 3 : 2}
                />
                <text x={tile.x + tile.w / 2} y={tile.y + tile.h / 2 - (showSub ? 5 : 0)}
                  textAnchor="middle" fill="#fff"
                  fontSize={fontSize} fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {tile.ticker}
                </text>
                {showSub && (
                  <text x={tile.x + tile.w / 2} y={tile.y + tile.h / 2 + 10}
                    textAnchor="middle" fill={isHovered ? '#fff' : '#aaa'}
                    fontSize={Math.max(7, fontSize - 2)}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {mode === 'INSIDER_NET'
                      ? formatCurrency(tile.netValue)
                      : mode === 'BUY_RATIO'
                        ? `${tile.buyCount}B/${tile.sellCount}S`
                        : formatCurrency(tile.totalValue)
                    }
                  </text>
                )}
                {/* Hover tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={tile.x + 4} y={tile.y + tile.h + 2}
                      width={tile.w - 8} height={16}
                      fill="rgba(0,0,0,0.85)" rx={2}
                      stroke="#ff8c00" strokeWidth={1}
                    />
                    <text
                      x={tile.x + tile.w / 2}
                      y={tile.y + tile.h + 13}
                      textAnchor="middle" fill="#e6e6e6"
                      fontSize={7} fontFamily="JetBrains Mono, monospace"
                    >
                      {truncate(tile.company, 30)} · {formatCurrency(tile.totalValue)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {layout.length === 0 && (
            <text x={dims.w / 2} y={dims.h / 2} textAnchor="middle"
              fill="#555" fontSize={11} fontFamily="JetBrains Mono, monospace">
              NO DATA AVAILABLE
            </text>
          )}
        </svg>
      </div>

      {/* Footer */}
      <div style={STYLES.footer}>
        <span>
          TREEMAP | {tileData.length} TICKERS | COLOR: {mode.replace('_', ' ')}
          {' '}| TILE SIZE = TRADE VOLUME
        </span>
        <span style={{ marginLeft: 'auto' }}>{today} | v0.2.0</span>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{
        width: 8, height: 8, borderRadius: 2,
        background: color, display: 'inline-block',
      }} />
      <span style={{
        fontSize: 7, color: '#888', fontFamily: 'JetBrains Mono',
        whiteSpace: 'nowrap',
      }}>{label}</span>
    </div>
  );
}
