import { HashRouter, Routes, Route } from 'react-router-dom';
import PasswordGate from '@/components/PasswordGate';
import DashboardPage from '@/pages/DashboardPage';

export default function App() {
  return (
    <PasswordGate>
      <HashRouter>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
        </Routes>
      </HashRouter>
    </PasswordGate>
  );
}
