import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Card, Button, Badge, Modal } from '../components/UI';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

const CYCLES = ['Monthly', 'Quarterly', 'Yearly', 'Weekly'];

export const Subscriptions = () => {
  const { formatCurrency, symbol } = useCurrency();
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    billingCycle: 'Monthly',
    nextBillingDate: new Date().toISOString().split('T')[0],
    category: 'Subscriptions',
    status: 'Active',
    remindDaysBefore: 3,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/subscriptions');
      if (res.success) {
        setSubData(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleOpenAdd = () => {
    setEditingSub(null);
    setFormData({
      name: '',
      amount: '',
      billingCycle: 'Monthly',
      nextBillingDate: new Date().toISOString().split('T')[0],
      category: 'Subscriptions',
      status: 'Active',
      remindDaysBefore: 3,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      amount: sub.amount,
      billingCycle: sub.billingCycle || 'Monthly',
      nextBillingDate: sub.nextBillingDate ? new Date(sub.nextBillingDate).toISOString().split('T')[0] : '',
      category: sub.category || 'Subscriptions',
      status: sub.status || 'Active',
      remindDaysBefore: sub.remindDaysBefore !== undefined ? sub.remindDaysBefore : 3,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.nextBillingDate) return;
    setIsSaving(true);
    try {
      if (editingSub) {
        await apiFetch(`/subscriptions/${editingSub._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/subscriptions', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      fetchSubscriptions();
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subscription?')) return;
    try {
      await apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
      fetchSubscriptions();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">Subscriptions & Recurring Bills</h2>
          <p className="text-xs text-slate-400">
            Audit recurring obligations, track annual load, and prevent surprise renewals
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAdd} icon={Plus}>
          Add Subscription
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <span className="text-xs text-slate-400 font-medium">Active Subscriptions</span>
          <p className="text-2xl font-bold text-slate-100 font-heading mt-1">{subData?.count || 0}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Recurring services tracked</span>
        </Card>

        <Card className="glass-card">
          <span className="text-xs text-slate-400 font-medium">Monthly Burden</span>
          <p className="text-2xl font-bold text-emerald-400 font-heading mt-1">
            {formatCurrency(subData?.monthlyTotal || 0)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Monthly recurring burn</span>
        </Card>

        <Card className="glass-card">
          <span className="text-xs text-slate-400 font-medium">Annualized Projected Load</span>
          <p className="text-2xl font-bold text-teal-300 font-heading mt-1">
            {formatCurrency(subData?.annualTotal || 0)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">12-month cumulative cost</span>
        </Card>
      </div>

      {/* Subscription Grid & Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
          ))
        ) : !subData?.subscriptions?.length ? (
          <div className="col-span-full">
            <Card className="glass-panel text-center py-12">
              <CreditCard className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-slate-200">No active subscriptions added</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Track Netflix, Spotify, AWS, Gym, or rent to get accurate safe-to-spend calculations.
              </p>
              <Button variant="primary" size="sm" onClick={handleOpenAdd}>
                Add First Subscription
              </Button>
            </Card>
          </div>
        ) : (
          subData.subscriptions.map((sub) => (
            <Card key={sub._id} className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-100 text-base font-heading">{sub.name}</h3>
                    <span className="text-[11px] text-slate-400">{sub.category}</span>
                  </div>
                  <Badge variant={sub.status === 'Active' ? 'success' : 'neutral'}>{sub.status}</Badge>
                </div>

                <div className="mb-3">
                  <span className="text-2xl font-bold text-emerald-400 font-heading">
                    {formatCurrency(sub.amount)}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">/ {sub.billingCycle.toLowerCase()}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center gap-2 text-slate-400 mb-3">
                  <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Next Renewal: {new Date(sub.nextBillingDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleOpenEdit(sub)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(sub._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSub ? 'Edit Subscription' : 'Add Subscription'}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Service / Bill Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Netflix, Spotify, Gym Membership"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Amount ({symbol})</label>
              <input
                type="number"
                required
                min="1"
                placeholder="649"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 font-heading font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Billing Cycle</label>
              <select
                value={formData.billingCycle}
                onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CYCLES.map((c) => (
                  <option key={c} value={c} className="bg-slate-900 text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Next Billing Date</label>
            <input
              type="date"
              required
              value={formData.nextBillingDate}
              onChange={(e) => setFormData({ ...formData, nextBillingDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={isSaving}>
              {editingSub ? 'Update Subscription' : 'Save Subscription'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Subscriptions;
