import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { GymProvider } from './context/GymContext';
import Layout from './components/Layout';
import Overview from './pages/admin/Overview';
import Members from './pages/admin/Members';
import Attendance from './pages/admin/Attendance';
import Memberships from './pages/admin/Memberships';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import Progress from './pages/Progress';
import { UserOverview, UserMembership, UserProfile } from './pages/user/UserPages';
import Auth from './pages/auth/Auth';
import { Brand } from './components/UI';

export default function App() {
  return (
    <GymProvider>
      <BrowserRouter>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<Auth key="login" />} />
          <Route path="/register" element={<Auth key="register" />} />
          <Route path="/verify-email" element={<Auth key="verify" />} />
          <Route element={<Layout />}>
            <Route path="/admin" element={<Overview />} />
            <Route path="/admin/members" element={<Members />} />
            <Route path="/admin/attendance" element={<Attendance />} />
            <Route path="/admin/memberships" element={<Memberships />} />
            <Route path="/admin/progress" element={<Progress />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/user" element={<UserOverview />} />
            <Route path="/user/membership" element={<UserMembership />} />
            <Route path="/user/attendance" element={<Attendance user />} />
            <Route path="/user/progress" element={<Progress user />} />
            <Route path="/user/profile" element={<UserProfile />} />
          </Route>
          <Route
            path="*"
            element={
              <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas p-6 text-center">
                <Brand />
                <p className="mt-5 text-5xl font-bold text-brand-strong">404</p>
                <h1 className="text-xl font-bold">A little off the path</h1>
                <p className="text-sm text-muted">
                  This page doesn’t exist. Your district is one click away.
                </p>
                <Link to="/admin" className="btn btn-primary">
                  Back to dashboard
                </Link>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </GymProvider>
  );
}
