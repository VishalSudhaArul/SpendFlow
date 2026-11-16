import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ThemeProvider } from './context/ThemeProvider.jsx';
import { ToastProvider } from './context/ToastProvider.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { GuestOnly, RequireAuth } from './components/auth/RouteGuards.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import SystemStatus from './pages/SystemStatus.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestOnly />}>
                <Route element={<AuthLayout />}>
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                </Route>
              </Route>

              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  {/* "/" becomes the dashboard in Phase 7. */}
                  <Route index element={<Navigate to="/profile" replace />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="status" element={<SystemStatus />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
