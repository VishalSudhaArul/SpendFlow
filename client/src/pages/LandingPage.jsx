import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Brain,
  Sliders,
  PiggyBank,
  CheckCircle2,
  Lock,
  Layers,
  BarChart3,
  Bot,
  Zap,
} from 'lucide-react';
import { Button, Card, Badge } from '../components/UI';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <span className="text-xl font-bold font-heading tracking-tight">
            SpendFlow <span className="text-emerald-400">AI</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          <a href="#features" className="hover:text-slate-100 transition">Features</a>
          <a href="#ai-capabilities" className="hover:text-slate-100 transition">AI Intelligence</a>
          <a href="#how-it-works" className="hover:text-slate-100 transition">How it Works</a>
          <a href="#security" className="hover:text-slate-100 transition">Security</a>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="sm" icon={ArrowRight}>Get Started Free</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          The Next-Gen Financial Companion
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-100 font-heading leading-[1.1] mb-6">
          Understand your money.{' '}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Spend smarter.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          SpendFlow AI helps you track expenses, understand spending patterns, plan budgets, forecast expenses, and make smarter financial decisions with real deterministic intelligence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
          <Link to="/register" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full" icon={ArrowRight}>
              Start Tracking Now
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full">
              Explore Demo Account
            </Button>
          </Link>
        </div>

        {/* Dashboard Mockup Banner */}
        <div className="relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3 shadow-2xl backdrop-blur-xl max-w-4xl mx-auto group">
          <div className="rounded-xl bg-slate-950 p-6 border border-slate-800 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-slate-500 ml-2 font-mono">spendflow.ai/dashboard</span>
              </div>
              <Badge variant="success">Safe to Spend: ₹1,420/day</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Total Monthly Inflow</span>
                <p className="text-2xl font-bold text-slate-100 font-heading mt-1">₹85,000</p>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" /> +12% from last month
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">Financial Health Score</span>
                <p className="text-2xl font-bold text-emerald-400 font-heading mt-1">88 / 100</p>
                <span className="text-[11px] text-slate-400 mt-1 block">Excellent savings discipline</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-400">AI Daily Run-Rate</span>
                <p className="text-2xl font-bold text-teal-300 font-heading mt-1">₹1,150</p>
                <span className="text-[11px] text-emerald-400 mt-1 block">18% below maximum cap</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Flow / Value Pillar Section */}
      <section className="py-20 border-y border-slate-800/80 bg-slate-950/60">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-2">The Methodology</h2>
          <p className="text-2xl sm:text-3xl font-bold text-slate-100 font-heading mb-12">
            Track → Understand → Analyze → Predict → Simulate → Improve
          </p>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { step: '01', title: 'TRACK', desc: 'Natural language & automated entry' },
              { step: '02', title: 'UNDERSTAND', desc: 'Categorization & merchant breakdown' },
              { step: '03', title: 'ANALYZE', desc: 'Cash flow & 90-day heatmap' },
              { step: '04', title: 'PREDICT', desc: 'Statistical run-rate forecasting' },
              { step: '05', title: 'SIMULATE', desc: 'Interactive What-If scenarios' },
              { step: '06', title: 'IMPROVE', desc: 'Personalized AI recommendations' },
            ].map((p, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-left">
                <span className="text-[10px] font-mono font-bold text-emerald-400/80 block mb-1">{p.step}</span>
                <h4 className="font-bold text-slate-200 text-sm">{p.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="success" className="mb-3">Comprehensive Suite</Badge>
          <h3 className="text-3xl sm:text-4xl font-bold text-slate-100 font-heading">
            Engineered for complete financial command.
          </h3>
          <p className="text-slate-400 mt-3 text-sm sm:text-base">
            SpendFlow AI brings enterprise-grade financial analytics and conversational coaching directly to your fingertips.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-100 font-heading mb-2">Deterministic Safe-to-Spend</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Always know exactly how much discretionary capital is safe to spend today after factoring in bills, target savings, and reserves.
            </p>
          </Card>

          <Card className="glass-card">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-100 font-heading mb-2">Ground-Truth AI Coach</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Ask any question about your finances. SpendFlow AI calculates the true numbers first, ensuring zero hallucinations and 100% reliable insights.
            </p>
          </Card>

          <Card className="glass-card">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-100 font-heading mb-2">What-If Financial Sandbox</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Simulate decisions before you make them. Test expense reductions, salary increases, or major purchases to see their long-term compounding impact.
            </p>
          </Card>

          <Card className="glass-card">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-100 font-heading mb-2">Spending Heatmap & Trends</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Identify high-velocity days, weekend trends, and top merchant habits with dynamic visual analytics and custom timeframe filters.
            </p>
          </Card>

          <Card className="glass-card">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
              <PiggyBank className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-100 font-heading mb-2">AI Budget Allocation</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generate optimized 50/30/20 budget allocations tailored to your actual income and historical living expenses with one click.
            </p>
          </Card>

          <Card className="glass-card">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-bold text-slate-100 font-heading mb-2">Statistical Anomaly Guard</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Detect unusual transactions using standard-deviation bounds (2.5σ) so unexpected price spikes and double charges are caught instantly.
            </p>
          </Card>
        </div>
      </section>

      {/* Security & Trust Section */}
      <section id="security" className="py-20 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-slate-100 font-heading mb-3">
            Bank-Grade Security & Strict Privacy
          </h3>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8">
            Your financial privacy is sacred. We never expose raw database credentials or passwords to AI models. All calculations remain isolated to authenticated users.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> End-to-End JWT Auth</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Salted Bcrypt Hashing</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Isolated MongoDB Queries</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Full Data Export & Deletion</span>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 text-center max-w-4xl mx-auto px-6">
        <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-100 font-heading mb-4">
          Ready to achieve financial clarity?
        </h3>
        <p className="text-slate-400 text-base mb-8 max-w-xl mx-auto">
          Join SpendFlow AI today and transform how you track, forecast, and grow your wealth.
        </p>
        <Link to="/register">
          <Button variant="primary" size="lg" icon={ArrowRight}>
            Create Your Free Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">SpendFlow AI</span>
            <span>— Intelligent Financial Companion</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <a href="https://github.com/VishalSudhaArul/SpendFlow" target="_blank" rel="noreferrer" className="hover:text-slate-300">
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
