import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/UI';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        if (res.user?.onboardingCompleted) {
          navigate('/dashboard');
        } else {
          navigate('/onboarding');
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@spendflow.ai');
    setPassword('DemoPass123!');
    setError('');
    setLoading(true);
    try {
      // Try login first, or register demo user if not existing
      try {
        const res = await login('demo@spendflow.ai', 'DemoPass123!');
        if (res.success) {
          navigate('/dashboard');
          return;
        }
      } catch (e) {
        // Auto register demo
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Alex Rivera',
            email: 'demo@spendflow.ai',
            password: 'DemoPass123!',
            currency: 'INR',
            monthlyIncome: 75000,
            financialGoal: 'Save more',
          }),
        });
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('spendflow_token', data.token);
          // complete onboarding with demo seed
          await fetch('/api/auth/onboarding', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.token}`,
            },
            body: JSON.stringify({
              currency: 'INR',
              monthlyIncome: 75000,
              financialGoal: 'Save more',
              sampleData: true,
            }),
          });
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      setError('Demo setup failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <span className="text-2xl font-bold font-heading text-slate-100">
              SpendFlow <span className="text-emerald-400">AI</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-slate-100 font-heading">Welcome back</h2>
          <p className="text-xs text-slate-400 mt-1">Access your intelligent financial dashboard</p>
        </div>

        <Card className="glass-panel">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <Button variant="primary" size="md" className="w-full" loading={loading} type="submit">
              Sign In
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-2 text-slate-500">or explore instantly</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="md"
              type="button"
              className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={handleDemoLogin}
              loading={loading}
              icon={Sparkles}
            >
              One-Click Demo Login
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login;
