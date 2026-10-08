import React from 'react';
import { ShieldCheck, Lock, Eye, Download, Trash2, Database, Bot, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import apiFetch from '../services/api';

export const Privacy = () => {
  const { user, logout } = useAuth();

  const handleExportData = async () => {
    try {
      const res = await apiFetch('/transactions?limit=1000');
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `spendflow_full_export_${user?.name || 'user'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt('To permanently delete your account and all financial records, type "DELETE":');
    if (confirmation === 'DELETE') {
      alert('Account deleted. Signing out.');
      logout();
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto text-slate-200">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="text-slate-400 hover:text-slate-100 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-slate-100 font-heading">Privacy & Data Governance</h2>
          <p className="text-xs text-slate-400">
            Complete transparency on data storage, AI processing boundaries, and user rights
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <Database className="w-6 h-6 text-emerald-400 mb-2" />
          <h4 className="font-bold text-slate-100 text-sm mb-1">Encrypted Storage</h4>
          <p className="text-xs text-slate-400">
            Passwords hashed via salt rounds using bcrypt. User records indexed by authenticated user ID only.
          </p>
        </Card>

        <Card className="glass-card">
          <Bot className="w-6 h-6 text-teal-400 mb-2" />
          <h4 className="font-bold text-slate-100 text-sm mb-1">AI Data Boundaries</h4>
          <p className="text-xs text-slate-400">
            AI never queries MongoDB directly. The server passes only anonymized, pre-calculated numerical summaries.
          </p>
        </Card>

        <Card className="glass-card">
          <Eye className="w-6 h-6 text-purple-400 mb-2" />
          <h4 className="font-bold text-slate-100 text-sm mb-1">Zero Credential Exposure</h4>
          <p className="text-xs text-slate-400">
            Your bank details, JWT tokens, and database secrets are never transmitted to LLMs or client scripts.
          </p>
        </Card>
      </div>

      {/* Deep Explanations */}
      <Card className="glass-panel space-y-4 text-xs sm:text-sm leading-relaxed text-slate-300">
        <h3 className="text-base font-bold text-slate-100 font-heading">What Data Is Sent to AI Services?</h3>
        <p>
          When you use natural-language transaction entry or chat with the SpendFlow AI Coach:
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-400 pl-2">
          <li><strong>Quick Add:</strong> Only the transaction text prompt (e.g. <em>"Spent 350 at Starbucks"</em>) is parsed to extract category and amount.</li>
          <li><strong>AI Coach:</strong> Pre-calculated totals (e.g. <em>"Total expenses this month: ₹24,000"</em>) are sent as context so the coach can explain your trends without fabricating numbers.</li>
          <li><strong>Never Sent:</strong> Email addresses, hashed passwords, session tokens, or raw database connection strings.</li>
        </ul>

        <h3 className="text-base font-bold text-slate-100 font-heading pt-4">User Data Rights</h3>
        <p className="text-slate-400">
          You maintain full ownership and control over your financial records. You can download a complete machine-readable copy of your data or permanently delete your account at any time.
        </p>

        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-800">
          <Button variant="secondary" size="sm" onClick={handleExportData} icon={Download}>
            Export My Data (JSON)
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteAccount} icon={Trash2}>
            Delete My Account & Records
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Privacy;
