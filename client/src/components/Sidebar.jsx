import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Target,
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  Sliders,
  User,
  LogOut,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Transactions', path: '/transactions', icon: Receipt },
  { name: 'Budget', path: '/budget', icon: PiggyBank },
  { name: 'Goals', path: '/goals', icon: Target },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'AI Coach', path: '/ai-coach', icon: Bot, badge: 'AI' },
  { name: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
  { name: 'What-If', path: '/what-if', icon: Sliders, badge: 'Sim' },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Profile', path: '/profile', icon: User },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-slate-950/90 border-r border-slate-800/80 backdrop-blur-xl z-40 p-4 select-none">
      {/* Brand Logo */}
      <div
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-3 px-3 py-3 mb-6 cursor-pointer group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
          <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-tight font-heading flex items-center gap-1.5">
            SpendFlow <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">Financial Intelligence</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4.5 h-4.5 shrink-0 group-hover:text-emerald-400 transition-colors" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Card & Logout */}
      <div className="pt-4 mt-auto border-t border-slate-800/80">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
