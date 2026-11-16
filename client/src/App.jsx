import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { ThemeProvider } from './context/ThemeProvider.jsx';
import { ToastProvider } from './context/ToastProvider.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import SystemStatus from './pages/SystemStatus.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              {/* "/" becomes the dashboard once authentication lands (Phase 4/7). */}
              <Route index element={<Navigate to="/status" replace />} />
              <Route path="status" element={<SystemStatus />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
