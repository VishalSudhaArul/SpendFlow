import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import Header from './components/Header';
import QuickNLAddModal from './components/QuickNLAddModal';
import AddTransactionModal from './components/AddTransactionModal';
import CSVImportModal from './components/CSVImportModal';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Analytics from './pages/Analytics';
import AICoach from './pages/AICoach';
import Subscriptions from './pages/Subscriptions';
import WhatIf from './pages/WhatIf';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Privacy from './pages/Privacy';

const ProtectedLayout = ({
  onOpenQuickNL,
  onOpenAddTxn,
  onOpenCSVModal,
  onEditTxn,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Header onOpenQuickNL={onOpenQuickNL} onOpenAddTxn={onOpenAddTxn} />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto pb-24 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Bottom Nav for Mobile */}
      <MobileNav />
    </div>
  );
};

export const App = () => {
  const [isQuickNLOpen, setIsQuickNLOpen] = useState(false);
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);
  const [isCSVOpen, setIsCSVOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);

  const handleEditTxn = (txn) => {
    setEditingTxn(txn);
    setIsAddTxnOpen(true);
  };

  const handleTxnSaved = () => {
    setEditingTxn(null);
    window.dispatchEvent(new Event('spendflow_refresh_data'));
  };

  return (
    <AuthProvider>
      <CurrencyProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Protected App Routes */}
              <Route
                element={
                  <ProtectedLayout
                    onOpenQuickNL={() => setIsQuickNLOpen(true)}
                    onOpenAddTxn={() => {
                      setEditingTxn(null);
                      setIsAddTxnOpen(true);
                    }}
                    onOpenCSVModal={() => setIsCSVOpen(true)}
                    onEditTxn={handleEditTxn}
                  />
                }
              >
                <Route
                  path="/dashboard"
                  element={
                    <Dashboard
                      onOpenQuickNL={() => setIsQuickNLOpen(true)}
                      onOpenAddTxn={() => {
                        setEditingTxn(null);
                        setIsAddTxnOpen(true);
                      }}
                    />
                  }
                />
                <Route
                  path="/transactions"
                  element={
                    <Transactions
                      onOpenQuickNL={() => setIsQuickNLOpen(true)}
                      onOpenAddTxn={() => {
                        setEditingTxn(null);
                        setIsAddTxnOpen(true);
                      }}
                      onOpenCSVModal={() => setIsCSVOpen(true)}
                      onEditTxn={handleEditTxn}
                    />
                  }
                />
                <Route path="/budget" element={<Budgets />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/ai-coach" element={<AICoach />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/what-if" element={<WhatIf />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/privacy" element={<Privacy />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

            {/* Global Modals */}
            <QuickNLAddModal
              isOpen={isQuickNLOpen}
              onClose={() => setIsQuickNLOpen(false)}
              onTransactionCreated={handleTxnSaved}
            />

            <AddTransactionModal
              isOpen={isAddTxnOpen}
              onClose={() => {
                setIsAddTxnOpen(false);
                setEditingTxn(null);
              }}
              onTransactionSaved={handleTxnSaved}
              editTransaction={editingTxn}
            />

            <CSVImportModal
              isOpen={isCSVOpen}
              onClose={() => setIsCSVOpen(false)}
              onImportComplete={handleTxnSaved}
            />
          </BrowserRouter>
        </NotificationProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
};

export default App;
