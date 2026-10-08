import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Bell, Plus, CheckCircle2, AlertTriangle, Info, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Button, Badge } from './UI';

export const Header = ({ onOpenQuickNL, onOpenAddTxn }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotifIcon = (type) => {
    switch (type) {
      case 'budget_warning':
      case 'budget_exceeded':
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'bill_due':
        return <Calendar className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'milestone':
        return <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-4 flex items-center justify-between">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-100 font-heading">
          {getGreeting()},{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            {user?.name?.split(' ')[0] || 'Member'}
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">
          Here is your intelligent financial snapshot for this month.
        </p>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Quick AI NL Add Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenQuickNL}
          className="hidden md:flex border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15"
          icon={Sparkles}
        >
          AI Quick Add
        </Button>

        {/* Regular Add Transaction */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenAddTxn}
          icon={Plus}
        >
          Add Expense
        </Button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">Smart Alerts</h4>
                  {unreadCount > 0 && <Badge variant="success">{unreadCount} New</Badge>}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-emerald-400 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No notifications yet. You are all caught up!</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      onClick={() => !n.read && markAsRead(n._id)}
                      className={`p-3 rounded-xl border text-xs transition cursor-pointer ${
                        n.read
                          ? 'bg-slate-900/40 border-slate-800/60 text-slate-400 opacity-75'
                          : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {getNotifIcon(n.type)}
                        <div className="flex-1">
                          <p className="font-semibold text-slate-100">{n.title}</p>
                          <p className="text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
