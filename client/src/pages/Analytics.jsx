import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Store,
  PieChart as PieIcon,
  Flame,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card, Button, Badge } from '../components/UI';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

const TIMEFRAMES = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '3 Months', value: '3m' },
  { label: '6 Months', value: '6m' },
  { label: '1 Year', value: '1y' },
];

export const Analytics = () => {
  const { formatCurrency, symbol } = useCurrency();
  const [timeframe, setTimeframe] = useState('30d');
  const [trendData, setTrendData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [categoryDetail, setCategoryDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [trendsRes, heatmapRes, merchantsRes, catRes] = await Promise.all([
        apiFetch(`/analytics/trends?timeframe=${timeframe}`),
        apiFetch('/analytics/heatmap'),
        apiFetch('/analytics/merchants'),
        apiFetch(`/analytics/category/${selectedCategory}`),
      ]);

      if (trendsRes.success) setTrendData(trendsRes.data || []);
      if (heatmapRes.success) setHeatmapData(heatmapRes.data || []);
      if (merchantsRes.success) setMerchants(merchantsRes.data || []);
      if (catRes.success) setCategoryDetail(catRes);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const handleCategoryChange = async (cat) => {
    setSelectedCategory(cat);
    try {
      const res = await apiFetch(`/analytics/category/${cat}`);
      if (res.success) setCategoryDetail(res);
    } catch (e) {
      console.error(e);
    }
  };

  // Generate 90 day calendar cells for heatmap
  const getHeatmapColor = (amount) => {
    if (!amount || amount === 0) return 'bg-slate-900 border-slate-800';
    if (amount < 500) return 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400';
    if (amount < 2000) return 'bg-emerald-800/80 border-emerald-700/80 text-emerald-300';
    if (amount < 5000) return 'bg-emerald-600 border-emerald-500 text-slate-950 font-bold';
    return 'bg-amber-500 border-amber-400 text-slate-950 font-bold';
  };

  const heatmapLookup = {};
  heatmapData.forEach((d) => {
    heatmapLookup[d.date] = d.amount;
  });

  const last90Days = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    last90Days.push({
      dateStr,
      dayOfMonth: d.getDate(),
      dayOfWeek: d.getDay(),
      amount: heatmapLookup[dateStr] || 0,
    });
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Timeframe Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">Financial Intelligence & Analytics</h2>
          <p className="text-xs text-slate-400">
            Cash flow trajectory, velocity heatmap, merchant deep dives, and category trends
          </p>
        </div>

        {/* Timeframe Pills */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                timeframe === tf.value
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Income vs Expense Cash Flow Chart */}
      <Card className="glass-panel">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-100 font-heading">Income vs Expenses Trajectory</h3>
            <p className="text-xs text-slate-400">Visualizing inflow deposits against outflow velocity</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Income
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Expenses
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              No transactions found for the selected timeframe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${symbol}${v}`} />
                <Tooltip
                  formatter={(val, name) => [formatCurrency(val), name === 'income' ? 'Income' : 'Expense']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGradient)" />
                <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={2} fillOpacity={1} fill="url(#expenseGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* 2. 90-Day Spending Intensity Heatmap */}
      <Card className="glass-panel">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 font-heading">Spending Intensity Heatmap</h3>
              <p className="text-xs text-slate-400">90-day daily velocity pattern (identifying high spending weekends)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>Low</span>
            <span className="w-3 h-3 rounded bg-slate-900 border border-slate-800" />
            <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-900" />
            <span className="w-3 h-3 rounded bg-emerald-700" />
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span className="w-3 h-3 rounded bg-amber-500" />
            <span>High Intensity</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 min-w-[650px]">
            {last90Days.map((cell, idx) => (
              <div
                key={idx}
                title={`${cell.dateStr}: ${cell.amount > 0 ? formatCurrency(cell.amount) : 'No expenses'}`}
                className={`w-4 h-4 rounded-md border text-[8px] flex items-center justify-center transition-transform hover:scale-125 cursor-pointer ${getHeatmapColor(
                  cell.amount
                )}`}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Bottom Grid: Top Merchants & Category Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Merchants Leaderboard */}
        <Card className="glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100 font-heading">Top Merchants & Outlets</h3>
            </div>
            <Badge variant="neutral">Highest Spend</Badge>
          </div>

          {merchants.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No merchant data accumulated yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {merchants.slice(0, 6).map((m, i) => (
                <div key={m.merchant} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-bold flex items-center justify-center text-[10px]">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-200">{m.merchant}</p>
                      <span className="text-[11px] text-slate-500">
                        {m.count} transactions • Avg {formatCurrency(m.average)}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-emerald-400 font-heading text-sm">
                    {formatCurrency(m.totalSpent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Category In-Depth Drilldown */}
        <Card className="glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-teal-400" />
              <h3 className="text-base font-bold text-slate-100 font-heading">Category Deep-Dive</h3>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {['Food', 'Transport', 'Shopping', 'Bills', 'Rent', 'Education', 'Health', 'Entertainment', 'Travel', 'Subscriptions', 'Personal'].map((c) => (
                <option key={c} value={c} className="bg-slate-900 text-slate-200">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {categoryDetail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Current Month</span>
                  <span className="text-lg font-bold text-slate-100 font-heading">
                    {formatCurrency(categoryDetail.currentMonthTotal)}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {categoryDetail.currentMonthCount} transactions
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-0.5">vs Last Month</span>
                  <span className="text-lg font-bold text-slate-100 font-heading">
                    {formatCurrency(categoryDetail.lastMonthTotal)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold block mt-0.5 ${
                      categoryDetail.changePercentage > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {categoryDetail.changePercentage > 0 ? `+${categoryDetail.changePercentage}%` : `${categoryDetail.changePercentage}%`} MoM
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-2 text-[11px] uppercase tracking-wider">
                  Top Transactions in {selectedCategory}
                </span>
                <div className="space-y-1.5">
                  {categoryDetail.largestTransactions?.map((tx) => (
                    <div key={tx._id} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between">
                      <span className="text-slate-300 font-medium truncate max-w-[200px]">
                        {tx.merchant || tx.description || 'Expense'}
                      </span>
                      <span className="font-semibold text-slate-100">{formatCurrency(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
