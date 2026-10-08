import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Target,
  Shield,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Button, Card, Badge } from '../components/UI';
import apiFetch from '../services/api';

const GOALS = [
  { id: 'Save more', title: 'Save More', desc: 'Grow wealth & automate monthly savings', icon: TrendingUp },
  { id: 'Control spending', title: 'Control Spending', desc: 'Stop overspending and stay within budgets', icon: Layers },
  { id: 'Build emergency fund', title: 'Emergency Fund', desc: 'Build 3-6 months buffer for peace of mind', icon: Shield },
  { id: 'Reduce unnecessary expenses', title: 'Cut Wastage', desc: 'Audit subscriptions and recurring leaks', icon: Sparkles },
  { id: 'Track spending', title: 'Track Spending', desc: 'Gain 100% clarity into where money goes', icon: DollarSign },
  { id: 'Buy something specific', title: 'Target Purchase', desc: 'Plan for gadget, travel, or vehicle', icon: Target },
];

export const Onboarding = () => {
  const { user, updateUser } = useAuth();
  const { currencies } = useCurrency();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || '');
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [monthlyIncome, setMonthlyIncome] = useState(user?.monthlyIncome || 60000);
  const [typicalExpenses, setTypicalExpenses] = useState({
    Food: 12000,
    Rent: 18000,
    Transport: 4000,
    Shopping: 6000,
  });
  const [financialGoal, setFinancialGoal] = useState('Save more');
  const [seedSample, setSeedSample] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => setStep((s) => Math.min(5, s + 1));
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const budgetLimits = Object.entries(typicalExpenses).map(([category, limit]) => ({
        category,
        limit: Number(limit),
      }));

      const res = await apiFetch('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          name,
          currency,
          monthlyIncome: Number(monthlyIncome),
          financialGoal,
          initialBudgetLimits: budgetLimits,
          sampleData: seedSample,
        }),
      });

      if (res.success) {
        updateUser({
          name,
          currency,
          monthlyIncome: Number(monthlyIncome),
          financialGoal,
          onboardingCompleted: true,
        });
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Onboarding failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeSymbol = currencies[currency]?.symbol || '₹';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-emerald-400">Step {step} of 5</span>
            <span>{Math.round((step / 5) * 100)}% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        <Card className="glass-panel">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <Badge variant="success">Step 1: Personalization</Badge>
              <h2 className="text-2xl font-bold text-slate-100 font-heading">What should we call you?</h2>
              <p className="text-sm text-slate-400">
                SpendFlow AI will personalize your financial companion experience.
              </p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Your Preferred Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Step 2: Currency */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <Badge variant="success">Step 2: Base Currency</Badge>
              <h2 className="text-2xl font-bold text-slate-100 font-heading">Select your primary currency</h2>
              <p className="text-sm text-slate-400">
                All dashboards, charts, and AI reports will be presented in this currency.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                {Object.entries(currencies).map(([code, meta]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      currency === code
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-lg font-bold block">{meta.symbol}</span>
                    <span className="text-xs font-semibold block mt-1">{code}</span>
                    <span className="text-[10px] text-slate-500 truncate block">{meta.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Monthly Income */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <Badge variant="success">Step 3: Income Baseline</Badge>
              <h2 className="text-2xl font-bold text-slate-100 font-heading">What is your typical monthly income?</h2>
              <p className="text-sm text-slate-400">
                Used to calculate your Safe-to-Spend limits, savings rate, and 50/30/20 budget allocations.
              </p>
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Estimated Monthly Inflow ({activeSymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-400 font-bold">{activeSymbol}</span>
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xl font-bold text-slate-100 font-heading focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Typical Expenses */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <Badge variant="success">Step 4: Living Expenses</Badge>
              <h2 className="text-2xl font-bold text-slate-100 font-heading">Set initial monthly budget caps</h2>
              <p className="text-sm text-slate-400">
                You can adjust or add more categories anytime in the Budget tab.
              </p>
              <div className="space-y-3 pt-2">
                {Object.entries(typicalExpenses).map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="font-semibold text-slate-200 text-sm">{cat}</span>
                    <div className="flex items-center gap-1.5 w-36">
                      <span className="text-slate-500 text-xs">{activeSymbol}</span>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) =>
                          setTypicalExpenses({ ...typicalExpenses, [cat]: Number(e.target.value) })
                        }
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-sm text-right text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Goal & Sample Data Option */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <Badge variant="success">Step 5: Financial Focus</Badge>
              <h2 className="text-2xl font-bold text-slate-100 font-heading">What is your primary financial goal?</h2>
              <p className="text-sm text-slate-400">
                Our AI coach will tailor alerts, forecasts, and recommendations toward this objective.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setFinancialGoal(g.id)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        financialGoal === g.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-slate-100 shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${financialGoal === g.id ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span className="font-bold text-xs text-slate-200">{g.title}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 leading-snug block">{g.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={seedSample}
                    onChange={(e) => setSeedSample(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Pre-populate realistic sample transactions, subscriptions, and goals for demonstration</span>
                </label>
              </div>
            </div>
          )}

          {/* Nav Buttons */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800/80">
            {step > 1 ? (
              <Button variant="ghost" size="sm" onClick={handlePrev} icon={ArrowLeft}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button variant="primary" size="sm" onClick={handleNext} icon={ArrowRight}>
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleFinish}
                loading={isSubmitting}
                icon={CheckCircle2}
              >
                Launch SpendFlow AI
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
