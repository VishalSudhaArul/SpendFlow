import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  BarChart3,
  Bot,
  Sliders,
  User,
} from 'lucide-react';

const MOBILE_ITEMS = [
  { name: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', path: '/transactions', icon: Receipt },
  { name: 'AI Coach', path: '/ai-coach', icon: Bot },
  { name: 'Budget', path: '/budget', icon: PiggyBank },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'What-If', path: '/what-if', icon: Sliders },
  { name: 'Profile', path: '/profile', icon: User },
];

export const MobileNav = () => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800 backdrop-blur-xl px-2 py-2">
      <div className="flex items-center justify-around">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNav;
