import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Target,
  Plus,
  Sparkles,
  Calendar,
  CheckCircle2,
  Trash2,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import { Card, Button, Badge, Modal } from '../components/UI';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

const GOAL_CATEGORIES = ['Laptop', 'Phone', 'Travel', 'Emergency Fund', 'Education', 'Vehicle', 'Home', 'General Savings', 'Custom'];

export const Goals = () => {
  const { formatCurrency, symbol } = useCurrency();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Goal Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [category, setCategory] = useState('General Savings');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [isSaving, setIsSaving] = useState(false);

  // Contribute Modal
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/goals');
      if (res.success) {
        setGoals(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !targetAmount || !targetDate) return;
    setIsSaving(true);
    try {
      const res = await apiFetch('/goals', {
        method: 'POST',
        body: JSON.stringify({
          goalName,
          category,
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount) || 0,
          targetDate,
          priority,
        }),
      });
      if (res.success) {
        setIsModalOpen(false);
        setGoalName('');
        setTargetAmount('');
        setCurrentAmount('0');
        fetchGoals();
      }
    } catch (err) {
      alert(err.message || 'Failed to create goal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!selectedGoal || !depositAmount || Number(depositAmount) <= 0) return;
    setIsDepositing(true);
    try {
      const res = await apiFetch(`/goals/${selectedGoal._id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(depositAmount), note: depositNote }),
      });

      if (res.success) {
        if (res.data?.isCompleted) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        setIsContributeOpen(false);
        setDepositAmount('');
        setDepositNote('');
        fetchGoals();
      }
    } catch (err) {
      alert(err.message || 'Contribution failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await apiFetch(`/goals/${id}`, { method: 'DELETE' });
      fetchGoals();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">Savings Goals & Piggy Banks</h2>
          <p className="text-xs text-slate-400">
            Automate monthly milestones and track required pace toward your dreams
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} icon={Plus}>
          New Savings Goal
        </Button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-52 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
          ))
        ) : goals.length === 0 ? (
          <div className="col-span-full">
            <Card className="glass-panel text-center py-12">
              <Target className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-slate-200">No savings goals created</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Set a goal for a laptop, vacation, or emergency fund to let SpendFlow AI calculate your required monthly savings pace.
              </p>
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
                Create First Goal
              </Button>
            </Card>
          </div>
        ) : (
          goals.map((g) => (
            <Card key={g._id} className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base font-heading">{g.goalName}</h3>
                    <span className="text-[11px] text-slate-400">{g.category}</span>
                  </div>
                  {g.isCompleted ? (
                    <Badge variant="success">Completed 🎉</Badge>
                  ) : (
                    <Badge variant={g.priority === 'High' ? 'danger' : 'neutral'}>{g.priority} Priority</Badge>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-emerald-400 font-heading text-base">
                      {formatCurrency(g.currentAmount)}
                    </span>
                    <span className="text-slate-400">Target: {formatCurrency(g.targetAmount)}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${g.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{g.progressPercent}% funded</span>
                    <span>{formatCurrency(g.remainingAmount)} to go</span>
                  </div>
                </div>

                {/* Required Pace Metrics */}
                {!g.isCompleted && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs space-y-1 mb-4">
                    <div className="flex justify-between text-slate-400">
                      <span>Target Date:</span>
                      <span className="text-slate-200">{new Date(g.targetDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Required Monthly Pace:</span>
                      <span className="font-semibold text-emerald-400 font-heading">
                        {formatCurrency(g.requiredMonthly)} / mo
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleDeleteGoal(g._id)}
                  className="text-xs text-slate-500 hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {!g.isCompleted && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedGoal(g);
                      setIsContributeOpen(true);
                    }}
                    icon={Plus}
                  >
                    Add Funds
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Goal Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Savings Goal">
        <form onSubmit={handleCreateGoal} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Goal Name</label>
            <input
              type="text"
              required
              placeholder="e.g. MacBook Pro M3, Japan Trip, Emergency Buffer"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {GOAL_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="High" className="bg-slate-900 text-slate-200">High</option>
                <option value="Medium" className="bg-slate-900 text-slate-200">Medium</option>
                <option value="Low" className="bg-slate-900 text-slate-200">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Target Amount ({symbol})</label>
              <input
                type="number"
                required
                min="1"
                placeholder="50000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-heading font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Initial Deposit ({symbol})</label>
              <input
                type="number"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-heading font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Target Completion Date</label>
            <input
              type="date"
              required
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isSaving}>
              Create Goal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Contribute Funds Modal */}
      <Modal
        isOpen={isContributeOpen}
        onClose={() => setIsContributeOpen(false)}
        title={`Add Funds to ${selectedGoal?.goalName}`}
      >
        <form onSubmit={handleContribute} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Deposit Amount ({symbol})</label>
            <input
              type="number"
              required
              min="1"
              placeholder="1000"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-heading font-bold text-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Salary bonus deposit"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsContributeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isDepositing} icon={CheckCircle2}>
              Deposit Funds
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Goals;
