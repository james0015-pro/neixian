// Bloomberg terminal skeleton — shown while lazy chunks load
export function RouteLoadingSkeleton({ label }: { label?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#000', flexDirection: 'column', gap: 12,
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      <div style={{
        color: '#ff8c00', fontSize: 11, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase',
      }}>
        [{label || 'LOAD'}]
      </div>

      {/* Progress bar skeleton */}
      <div style={{
        width: 200, height: 2, background: '#1f1f1f', borderRadius: 1,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: '35%', background: '#ff8c00',
          animation: 'skeleton-shimmer 1.2s ease-in-out infinite',
        }} />
      </div>

      <div style={{ color: '#555', fontSize: 9 }}>
        LOADING MODULE...
      </div>

      {/* Inline CSS animation */}
      <style>{`
        @keyframes skeleton-shimmer {
          0% { width: 10%; margin-left: 0%; }
          50% { width: 40%; margin-left: 30%; }
          100% { width: 10%; margin-left: 90%; }
        }
      `}</style>
    </div>
  );
}

// Data-row skeleton for tables (used inside pages when data is loading)
export function DataRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 20,
      padding: '0 4px', gap: 4,
      borderBottom: '1px solid rgba(255,255,255,0.03)',
    }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: i === 0 ? 0.4 : i === 1 ? 1 : 0.6,
            height: 10,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 1,
            animation: 'skeleton-shimmer 1.2s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

// Panel loading skeleton (for Q2 detail panel)
export function PanelSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div style={{ padding: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <DataRowSkeleton key={i} cols={5} />
      ))}
    </div>
  );
}
