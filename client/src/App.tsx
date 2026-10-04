import { ReactElement, Suspense, lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { trackOnce } from './lib/track';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Leaderboard from './pages/Leaderboard';
import NotFound from './pages/NotFound';
import Register from './pages/Register';
import Welcome from './pages/Welcome';

// Admin code (and Recharts) is loaded only when an admin opens /admin, keeping the public bundle small.
const AdminShell = lazy(() => import('./admin/AdminShell'));
const AdminLogin = lazy(() => import('./admin/pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./admin/pages/AdminDashboard'));
const AdminExperiments = lazy(() => import('./admin/pages/AdminExperiments'));
const later = (node: ReactElement) => <Suspense fallback={<Spinner />}>{node}</Suspense>;

export default function App() {
  // First page view of the browser session (whichever page the visit starts on).
  useEffect(() => { if (!window.location.pathname.startsWith('/admin')) trackOnce('landing_page_view'); }, []);
  return (
    <Routes>
      <Route path="admin/login" element={later(<AdminLogin />)} />
      <Route path="admin" element={later(<AdminShell />)}>
        <Route index element={later(<AdminDashboard />)} />
        <Route path="experiments" element={later(<AdminExperiments />)} />
      </Route>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="register" element={<Register />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="dashboard/:code" element={<Dashboard />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
