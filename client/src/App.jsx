import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from './context/ThemeProvider.jsx';
import { ToastProvider } from './context/ToastProvider.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { GuestOnly, RequireAuth } from './components/auth/RouteGuards.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';

// Each page is its own chunk, downloaded the first time it is visited.
// Login/register stay in the main bundle so the first screen paints instantly.
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

const Landing = lazy(() => import('./pages/Landing.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Analytics = lazy(() => import('./pages/Analytics.jsx'));
const AICoach = lazy(() => import('./pages/AICoach.jsx'));
const Simulator = lazy(() => import('./pages/Simulator.jsx'));
const Bills = lazy(() => import('./pages/Bills.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Income = lazy(() => import('./pages/Income.jsx'));
const Budgets = lazy(() => import('./pages/Budgets.jsx'));
const Goals = lazy(() => import('./pages/Goals.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const SystemStatus = lazy(() => import('./pages/SystemStatus.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="welcome" element={<Landing />} />

                  <Route element={<GuestOnly />}>
                    <Route element={<AuthLayout />}>
                      <Route path="login" element={<Login />} />
                      <Route path="register" element={<Register />} />
                    </Route>
                  </Route>

                  <Route element={<RequireAuth />}>
                    <Route element={<AppLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="coach" element={<AICoach />} />
                      <Route path="transactions" element={<Transactions />} />
                      <Route path="income" element={<Income />} />
                      <Route path="bills" element={<Bills />} />
                      <Route path="budgets" element={<Budgets />} />
                      <Route path="goals" element={<Goals />} />
                      <Route path="simulator" element={<Simulator />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="status" element={<SystemStatus />} />
                    </Route>
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
