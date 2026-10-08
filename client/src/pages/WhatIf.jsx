import React, { useState } from 'react';
import {
  Sliders,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

const SCENARIOS = [
  { id: 'reduce_expense', label: 'Reduce Category Spending', defaultAmount: 2000, desc: 'Cut dining out or discretionary spending' },
  { id: 'income_increase', label: 'Income / Salary Raise', defaultAmount: 5000, desc: 'Promotion, bonus, or freelance client' },
  { id: 'one_time_purchase', label: 'One-Time Large Purchase', defaultAmount: 15000, desc: 'New phone, laptop, or gadget upgrade' },
  { id: 'rent_increase', label: 'Rent or Fixed Bill Hike', defaultAmount: 2500, desc: 'Higher monthly lease or utility costs' },
  { id: 'increase_savings', label: 'Automate Extra Savings', defaultAmount: 3000, desc: 'Deposit more directly into high-yield fund' },
];

export const WhatIf = () => {
  const { formatCurrency, symbol } = useCurrency();
  const [selectedScenario, setSelectedScenario] = useState('reduce_expense');
  const [amount, setAmount] = useState(2000);
  const [targetCategory, setTargetCategory] = useState('Food');
  const [simulation, setSimulation] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async (scenario = selectedScenario, simAmount = amount) => {
    setLoading(true);
    try {
      const res = await apiFetch('/what-if/simulate', {
        method: 'POST',
        body: JSON.stringify({
          scenarioType: scenario,
          changeAmount: Number(simAmount),
          targetCategory,
        }),
      });

      if (res.success) {
        setSimulation(res.simulation);
      }
    } catch (e) {
      alert(e.message || 'Simulation error');
    } finally {
      setLoading(false);
    }
  };

  const handleScenarioChange = (s) => {
    setSelectedScenario(s.id);
    setAmount(s.defaultAmount);
    handleSimulate(s.id, s.defaultAmount);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-100 font-heading">What-If Financial Simulator</h2>
            <Badge variant="success">Interactive Sandbox</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Model financial choices in advance to test their compound impact on monthly savings and goals
          </p>
        </div>
      </div>

      {/* Preset Scenario Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleScenarioChange(s)}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
              selectedScenario === s.id
                ? 'bg-emerald-500/15 border-emerald-500 text-slate-100 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <span className="font-bold text-xs block text-slate-200 mb-1">{s.label}</span>
            <span className="text-[10px] text-slate-400 block leading-tight">{s.desc}</span>
          </button>
        ))}
      </div>

      {/* Simulation Playground Controls */}
      <Card className="glass-panel space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex-1 space-y-2 w-full">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Simulated Amount: <span className="text-emerald-400 font-heading text-base">{formatCurrency(amount)}</span>
              </label>
              <span className="text-xs text-slate-500">Drag to adjust</span>
            </div>
            <input
              type="range"
              min="500"
              max="50000"
              step="500"
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
              }}
              onMouseUp={() => handleSimulate(selectedScenario, amount)}
              onTouchEnd={() => handleSimulate(selectedScenario, amount)}
              className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            loading={loading}
            onClick={() => handleSimulate()}
            icon={Calculator}
            className="shrink-0 w-full md:w-auto"
          >
            Calculate Impact
          </Button>
        </div>

        {/* Results Comparison Grid */}
        {simulation ? (
          <div className="space-y-6 animate-fade-in">
            {/* AI Narrative Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 text-xs sm:text-sm text-slate-200 leading-relaxed flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-400 block mb-1">AI Financial Synthesis</span>
                {simulation.explanation}
              </div>
            </div>

            {/* Current vs Projected Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Current */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                  Current Monthly Baseline
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Monthly Inflow:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(simulation.current.monthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Monthly Outflow:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(simulation.current.monthlyExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>Net Savings:</span>
                    <span className="font-bold text-emerald-400 font-heading text-sm">
                      {formatCurrency(simulation.current.monthlySavings)} ({simulation.current.savingsRate}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Projected */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/40 shadow-lg shadow-emerald-500/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold block">
                    Simulated Projection
                  </span>
                  <Badge variant="success">New Pace</Badge>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Projected Inflow:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(simulation.projected.monthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Projected Outflow:</span>
                    <span className="font-semibold text-slate-200">{formatCurrency(simulation.projected.monthlyExpenses)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>Projected Savings:</span>
                    <span className="font-bold text-teal-300 font-heading text-sm">
                      {formatCurrency(simulation.projected.monthlySavings)} ({simulation.projected.savingsRate}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Difference & Compound Annual Impact */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                    Net Impact & Compounding
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly Net Change:</span>
                      <span
                        className={`font-bold font-heading ${
                          simulation.difference.monthlySavingsDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {simulation.difference.monthlySavingsDifference >= 0 ? '+' : ''}
                        {formatCurrency(simulation.difference.monthlySavingsDifference)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Savings Rate Shift:</span>
                      <span className="font-semibold text-slate-200">
                        {simulation.difference.savingsRateChange >= 0 ? '+' : ''}
                        {simulation.difference.savingsRateChange}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    12-Month Annual Impact
                  </span>
                  <p
                    className={`text-xl font-bold font-heading mt-0.5 ${
                      simulation.difference.annualProjectedImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {simulation.difference.annualProjectedImpact >= 0 ? '+' : ''}
                    {formatCurrency(simulation.difference.annualProjectedImpact)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 text-xs">
            Select a scenario and click "Calculate Impact" to simulate outcomes.
          </div>
        )}
      </Card>
    </div>
  );
};

export default WhatIf;
