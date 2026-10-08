import React, { useState } from 'react';
import { User, Shield, Lock, Bell, DollarSign, Check, AlertCircle } from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

export const Profile = () => {
  const { user, updateUser } = useAuth();
  const { currencies } = useCurrency();

  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome || 0);
  const [financialGoal, setFinancialGoal] = useState(user?.financialGoal || 'Save more');
  const [themePreference, setThemePreference] = useState(user?.themePreference || 'dark');
  const [notificationPreferences, setNotificationPreferences] = useState(
    user?.notificationPreferences || {
      budgetAlerts: true,
      unusualSpending: true,
      billReminders: true,
      weeklyRecap: true,
      monthlyReport: true,
    }
  );

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg('');
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          currency,
          monthlyIncome: Number(monthlyIncome),
          financialGoal,
          themePreference,
          notificationPreferences,
        }),
      });

      if (res.success && res.user) {
        updateUser(res.user);
        setProfileMsg('Profile updated successfully!');
      }
    } catch (err) {
      setProfileMsg(err.message || 'Update failed');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMsg('New passwords do not match');
      return;
    }
    setIsChangingPass(true);
    setPassMsg('');
    try {
      const res = await apiFetch('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.success) {
        setPassMsg('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPassMsg(err.message || 'Failed to change password');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-100 font-heading">Account & Preferences</h2>
        <p className="text-xs text-slate-400">Manage your profile, currency, notifications, and credentials</p>
      </div>

      {/* Profile Form */}
      <Card className="glass-panel">
        <h3 className="text-base font-bold text-slate-100 font-heading mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-400" /> Personal Settings
        </h3>

        {profileMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs mb-4">
            {profileMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-900 border border-slate-800/60 rounded-xl px-3.5 py-2.5 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {Object.entries(currencies).map(([code, meta]) => (
                  <option key={code} value={code} className="bg-slate-900 text-slate-200">
                    {code} ({meta.symbol}) - {meta.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Monthly Income Baseline</label>
              <input
                type="number"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-heading font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Primary Financial Goal</label>
            <select
              value={financialGoal}
              onChange={(e) => setFinancialGoal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {[
                'Save more',
                'Control spending',
                'Build emergency fund',
                'Reduce unnecessary expenses',
                'Track spending',
                'Buy something specific',
              ].map((g) => (
                <option key={g} value={g} className="bg-slate-900 text-slate-200">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Notifications Toggles */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="font-semibold text-slate-200 text-xs mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-400" /> Smart In-App Alert Toggles
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              {Object.entries({
                budgetAlerts: 'Budget approaching limit or exceeded alerts',
                unusualSpending: 'Statistical anomaly flags on high-value transactions',
                billReminders: 'Upcoming recurring bill & subscription renewals',
                weeklyRecap: 'Weekly money recap insights',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notificationPreferences[key] ?? true}
                    onChange={(e) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        [key]: e.target.checked,
                      })
                    }
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button variant="primary" size="sm" type="submit" loading={isUpdatingProfile} icon={Check}>
              Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* Password Update Form */}
      <Card className="glass-panel">
        <h3 className="text-base font-bold text-slate-100 font-heading mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-purple-400" /> Security & Password
        </h3>

        {passMsg && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 ${
              passMsg.includes('success')
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}
          >
            {passMsg}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button variant="secondary" size="sm" type="submit" loading={isChangingPass}>
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Profile;
