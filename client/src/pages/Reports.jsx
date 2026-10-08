import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Printer,
  Download,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

export const Reports = () => {
  const { formatCurrency } = useCurrency();
  const [report, setReport] = useState(null);
  const [weeklyRecap, setWeeklyRecap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [reportRes, weeklyRes] = await Promise.all([
        apiFetch('/ai/monthly-report', {
          method: 'POST',
          body: JSON.stringify({ month: selectedMonth, year: selectedYear }),
        }),
        apiFetch('/ai/weekly-recap'),
      ]);

      if (reportRes.success) setReport(reportRes.data);
      if (weeklyRes.success) setWeeklyRecap(weeklyRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedMonth, selectedYear]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">Financial Intelligence Reports</h2>
          <p className="text-xs text-slate-400">
            Executive monthly breakdowns, weekly money recaps, and AI narratives
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={handlePrint} icon={Printer}>
            Print / Export PDF
          </Button>
        </div>
      </div>

      {/* 1. Weekly Recap ("Your Week in Money") */}
      {weeklyRecap && (
        <Card className="glass-panel border-teal-500/30 bg-teal-950/10 print:hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <h3 className="text-base font-bold text-slate-100 font-heading">Your Week in Money</h3>
            </div>
            <Badge variant="success">Past 7 Days</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Total Spent This Week</span>
              <span className="text-lg font-bold text-slate-100 font-heading">
                {formatCurrency(weeklyRecap.totalSpentThisWeek)}
              </span>
              <span
                className={`text-[10px] block mt-0.5 font-medium ${
                  weeklyRecap.changePercent > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {weeklyRecap.changePercent > 0 ? `+${weeklyRecap.changePercent}%` : `${weeklyRecap.changePercent}%`} vs last week
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block mb-0.5">Top Category</span>
              <span className="text-lg font-bold text-slate-100 font-heading">
                {weeklyRecap.topCategory?.category || 'General'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {formatCurrency(weeklyRecap.topCategory?.amount || 0)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 md:col-span-2 flex items-center">
              <p className="text-slate-300 leading-relaxed italic text-xs">
                "{weeklyRecap.recommendation}"
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* 2. Monthly Executive Report Document */}
      {report && (
        <Card className="glass-panel p-8 space-y-6 print:border-none print:shadow-none print:p-0">
          <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                Official Monthly Intelligence Report
              </span>
              <h3 className="text-2xl font-extrabold text-slate-100 font-heading">
                Executive Financial Summary ({selectedMonth}/{selectedYear})
              </h3>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-slate-200">
                    Month {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Metrics Overview Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-1">Total Income</span>
              <span className="text-xl font-bold text-slate-100 font-heading">
                {formatCurrency(report.summaryData?.totalIncome)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-1">Total Expenses</span>
              <span className="text-xl font-bold text-slate-100 font-heading">
                {formatCurrency(report.summaryData?.totalExpenses)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-1">Net Savings</span>
              <span className="text-xl font-bold text-emerald-400 font-heading">
                {formatCurrency(report.summaryData?.netSavings)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-slate-400 block mb-1">Health Score</span>
              <span className="text-xl font-bold text-slate-100 font-heading">
                {report.summaryData?.healthScore} / 100
              </span>
            </div>
          </div>

          {/* AI Narrative Section */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {report.aiNarrative}
          </div>

          {/* Actionable Recommendations */}
          <div>
            <h4 className="font-bold text-slate-200 text-sm mb-3">AI Actionable Recommendations for Next Month</h4>
            <div className="space-y-2">
              {report.recommendations?.map((rec, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Reports;
