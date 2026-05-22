import { HashRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from '@/pages/DashboardPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </HashRouter>
  );
}
