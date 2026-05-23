import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import PasswordGate from '@/components/PasswordGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import { RouteLoadingSkeleton } from '@/components/LoadingSkeleton';
import DashboardPage from '@/pages/DashboardPage';

const ScreenerPage = lazy(() => import('@/pages/ScreenerPage'));
const HeatmapPage = lazy(() => import('@/pages/HeatmapPage'));
const TreemapPage = lazy(() => import('@/pages/TreemapPage'));
const StockDetailPage = lazy(() => import('@/pages/StockDetailPage'));

export default function App() {
  return (
    <PasswordGate>
      <HashRouter>
        <ErrorBoundary pageName="APP">
          <Suspense fallback={<RouteLoadingSkeleton label="APP" />}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/screener"
                element={
                  <ErrorBoundary pageName="SCRN">
                    <Suspense fallback={<RouteLoadingSkeleton label="SCRN" />}>
                      <ScreenerPage />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="/heatmap"
                element={
                  <ErrorBoundary pageName="HTMP">
                    <Suspense fallback={<RouteLoadingSkeleton label="HTMP" />}>
                      <HeatmapPage />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="/treemap"
                element={
                  <ErrorBoundary pageName="TRMP">
                    <Suspense fallback={<RouteLoadingSkeleton label="TRMP" />}>
                      <TreemapPage />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="/stocks/:ticker"
                element={
                  <ErrorBoundary pageName="STOCK">
                    <Suspense fallback={<RouteLoadingSkeleton label="STOCK" />}>
                      <StockDetailPage />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </HashRouter>
    </PasswordGate>
  );
}
