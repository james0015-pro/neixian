import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import PasswordGate from '@/components/PasswordGate';
import DashboardPage from '@/pages/DashboardPage';

const ScreenerPage = lazy(() => import('@/pages/ScreenerPage'));
const HeatmapPage = lazy(() => import('@/pages/HeatmapPage'));
const TreemapPage = lazy(() => import('@/pages/TreemapPage'));

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: '#000', color: '#555',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
    }}>
      LOADING...
    </div>
  );
}

export default function App() {
  return (
    <PasswordGate>
      <HashRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/screener" element={<ScreenerPage />} />
            <Route path="/heatmap" element={<HeatmapPage />} />
            <Route path="/treemap" element={<TreemapPage />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </PasswordGate>
  );
}
