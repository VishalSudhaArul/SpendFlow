import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  CheckCircle2,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import apiFetch from '../services/api';

const SAMPLE_QUESTIONS = [
  'How much did I spend this month and what is my safe daily limit?',
  'Where did most of my money go?',
  'Can I afford a ₹5,000 purchase this week?',
  'What subscriptions or recurring costs can I optimize?',
  'Help me save ₹15,000 over the next 3 months.',
  'What is my biggest unnecessary expense category?',
];

export const AICoach = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const chatEndRef = useRef(null);

  const fetchHistory = async () => {
    try {
      const [histRes, recsRes] = await Promise.all([
        apiFetch('/ai/chat-history'),
        apiFetch('/ai/recommendations'),
      ]);

      if (histRes.success && histRes.data) {
        if (histRes.data.length === 0) {
          setMessages([
            {
              role: 'assistant',
              message: `Hello ${user?.name || 'there'}! I am your SpendFlow AI Coach. I have analyzed your live cash flows, savings pace, and active budgets. How can I assist your financial planning today?`,
              suggestedActions: [
                { label: 'Check Safe-to-Spend', action: 'navigate_dashboard' },
                { label: 'Optimize Budgets', action: 'navigate_budgets' },
              ],
            },
          ]);
        } else {
          setMessages(histRes.data);
        }
      }

      if (recsRes.success) {
        setRecommendations(recsRes.recommendations || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (location.state?.initialPrompt) {
      handleSendMessage(location.state.initialPrompt);
    }
  }, [location.state]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend = inputText) => {
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', message: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: textToSend }),
      });

      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          message: 'AI insights are temporarily unavailable. Please verify your connection or retry.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Clear your conversation history with SpendFlow AI?')) return;
    try {
      await apiFetch('/ai/chat-history', { method: 'DELETE' });
      setMessages([
        {
          role: 'assistant',
          message: 'Conversation history cleared. Ask me anything about your finances!',
        },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleActionClick = (action) => {
    if (action === 'navigate_dashboard') navigate('/dashboard');
    else if (action === 'navigate_budgets') navigate('/budget');
    else if (action === 'navigate_whatif') navigate('/what-if');
    else if (action === 'navigate_analytics') navigate('/analytics');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-100 font-heading">SpendFlow AI Coach</h2>
            <Badge variant="success">Ground-Truth Intelligence</Badge>
          </div>
          <p className="text-xs text-slate-400">
            Data-backed financial advice computed strictly against your real balances and transactions
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleClearHistory} icon={Trash2}>
          Clear History
        </Button>
      </div>

      {/* Top 3 AI Coaching Recommendations */}
      {recommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="glass-card border-emerald-500/20 bg-emerald-950/10">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={rec.impact === 'High' ? 'danger' : 'info'}>{rec.impact} Priority</Badge>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm mb-1">{rec.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Container */}
      <Card className="glass-panel p-0 flex flex-col h-[560px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 text-xs sm:text-sm ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Bot className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.message}</div>

                {/* Suggested Action Chips */}
                {m.suggestedActions && m.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/80 mt-2">
                    {m.suggestedActions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleActionClick(act.action)}
                        className="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-400 px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1"
                      >
                        {act.label} <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Bot className="w-4 h-4 animate-pulse" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Computing financial context and synthesizing advice...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Question Chips */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] text-slate-500 shrink-0">Ask:</span>
          {SAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 transition cursor-pointer shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask your coach anything (e.g. 'Can I afford ₹5,000 for concert tickets?')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={!inputText.trim() || loading}
            icon={Send}
          >
            Ask
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AICoach;
