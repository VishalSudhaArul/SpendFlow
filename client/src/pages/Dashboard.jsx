import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Wallet,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  AlertCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Card, Button, Badge } from '../components/UI';
import apiFetch from '../services/api';

const PIE_COLORS = ['#10B981', '#06B6D4', '#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6', '#64748B'];

export const Dashboard = ({ onOpenQuickNL, onOpenAddTxn }) => {
  const { user } = useAuth();
  const { formatCurrency, symbol } = useCurrency();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/analytics/dashboard-summary');
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900/60 rounded-2xl border border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-slate-900/60 rounded-2xl border border-slate-800" />
          <div className="h-72 bg-slate-900/60 rounded-2xl border border-slate-800" />
        </div>
      </div>
    );
  }

  const {
    totalIncome = 0,
    totalExpenses = 0,
    netSavings = 0,
    savingsRate = 0,
    currentBalance = 0,
    healthScore = { score: 75, grade: 'Good', summary: 'Finances are well managed.' },
    safeToSpend = { safeToSpendDaily: 0, daysRemaining: 15, explanation: '' },
    budgetUsage = { totalBudget: 0, totalSpentInBudget: 0, overallPercentage: 0, categories: [] },
    topCategories = [],
    upcomingBills = [],
    recentTransactions = [],
    activeGoals = [],
    forecast = null,
  } = summary || {};

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Safe To Spend Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/60 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" /> Safe to Spend Today
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-slate-100 font-heading">
                {formatCurrency(safeToSpend.safeToSpendDaily)}
              </span>
              <span className="text-xs sm:text-sm text-slate-400 font-medium">/ day remaining</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {safeToSpend.explanation ||
                `You have ${safeToSpend.daysRemaining} days left this month with planned reserve and bill deductions considered.`}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenQuickNL}
              icon={Sparkles}
              className="bg-emerald-500/10 hover:bg-emerald-500/20"
            >
              AI Quick Add
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenAddTxn}
              icon={Plus}
            >
              Add Expense
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/what-if')}
            >
              Simulate Decision
            </Button>
          </div>
        </div>
      </div>

      {/* 2. 4-Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Inflow</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 font-heading">{formatCurrency(totalIncome)}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Monthly confirmed deposits</span>
        </Card>

        {/* Total Expenses */}
        <Card className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Total Spent</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-100 font-heading">{formatCurrency(totalExpenses)}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Run-rate: {formatCurrency(forecast?.dailyAverage || 0)}/day
          </span>
        </Card>

        {/* Net Savings */}
        <Card className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Net Savings</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-heading">{formatCurrency(netSavings)}</p>
          <span className="text-[11px] text-emerald-400/90 mt-1 block">
            {savingsRate}% Savings Rate
          </span>
        </Card>

        {/* Financial Health Score */}
        <Card className="glass-card cursor-pointer hover:border-emerald-500/40" onClick={() => navigate('/analytics')}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Health Score</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-100 font-heading">{healthScore.score}</p>
            <span className="text-xs font-semibold text-emerald-400">/ 100 ({healthScore.grade})</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
              style={{ width: `${healthScore.score}%` }}
            />
          </div>
        </Card>
      </div>

      {/* 3. Middle Section: Spending Breakdown & AI Coach Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Donut */}
        <Card className="lg:col-span-2 glass-panel">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">Monthly Expense Distribution</h3>
              <p className="text-xs text-slate-400">Category breakdown of your current spending</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')} icon={ArrowUpRight}>
              View Analytics
            </Button>
          </div>

          {topCategories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No expense records found for this month.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topCategories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                    >
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {topCategories.slice(0, 5).map((cat, idx) => (
                  <div key={cat.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-slate-300 font-medium">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono">{cat.percentage}%</span>
                      <span className="font-semibold text-slate-100">{formatCurrency(cat.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* AI Financial Coach Prompt Card */}
        <Card className="glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-100 font-heading">AI Financial Coach</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              "{healthScore.summary}"
            </p>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Recommended Questions:
              </span>
              {[
                'Where did most of my money go?',
                'Can I afford ₹5,000 this weekend?',
                'What subscriptions can I reduce?',
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => navigate('/ai-coach', { state: { initialPrompt: prompt } })}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs border border-slate-800/80 transition flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full mt-4"
            onClick={() => navigate('/ai-coach')}
            icon={Sparkles}
          >
            Chat with AI Coach
          </Button>
        </Card>
      </div>

      {/* 4. Bottom Grid: Recent Activity & Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2 glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">Recent Transactions</h3>
              <p className="text-xs text-slate-400">Latest activity across your accounts</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')} icon={ArrowUpRight}>
              View All
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No transactions recorded yet.{' '}
              <button onClick={onOpenAddTxn} className="text-emerald-400 underline ml-1 cursor-pointer">
                Add your first expense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentTransactions.map((tx) => (
                <div key={tx._id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                        tx.type === 'income'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '–'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">
                        {tx.merchant || tx.description || tx.category}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {tx.category} • {new Date(tx.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-semibold font-heading text-sm ${
                        tx.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '–'}{formatCurrency(tx.amount)}
                    </span>
                    {tx.isAnomaly && (
                      <span className="block text-[10px] text-amber-400 font-medium">Unusual</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Bills & Subscriptions */}
        <Card className="glass-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-100 font-heading">Upcoming Bills</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/subscriptions')}>
              Manage
            </Button>
          </div>

          {upcomingBills.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No bills scheduled for this month.
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBills.map((bill) => (
                <div key={bill._id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-200">{bill.name}</p>
                      <span className="text-[10px] text-slate-500">
                        Due: {new Date(bill.nextBillingDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-slate-100">{formatCurrency(bill.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
