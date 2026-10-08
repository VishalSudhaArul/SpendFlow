# SpendFlow AI — Intelligent Financial Companion

> **"Track. Understand. Predict. Simulate. Improve."**
> An AI-powered personal financial intelligence platform built with the MERN stack (MongoDB, Express.js, React, Node.js).

---

## 🌟 Overview

**SpendFlow AI** is a personal financial companion that moves beyond basic expense recording. It delivers deterministic metric calculation (such as Safe-to-Spend limits, 0–100 Financial Health Scores, statistical run-rate forecasting, and 2.5σ anomaly detection) combined with a contextual conversational AI Coach.

---

## 🚀 Core Features

- **⚡ Safe-to-Spend Engine**: Computes exact daily discretionary allowances after reserving funds for upcoming bills, target goal savings, and safety buffers.
- **🛡️ 0–100 Financial Health Score**: Deterministic 5-factor scoring model measuring savings rate, budget adherence, spending velocity, subscription burden, and emergency fund momentum.
- **💬 SpendFlow AI Coach**: Context-grounded conversational assistant providing actionable guidance without hallucinating numbers.
- **🔮 What-If Financial Sandbox**: Interactive sliders to simulate income raises, expense cuts, or one-time purchases, modeling their 12-month compound impact.
- **📊 Advanced Analytics & Heatmap**: Recharts-driven cash flow trajectory, 90-day daily spending intensity calendar heatmap, and top merchant leaderboards.
- **✨ Natural Language AI Expense Entry**: Converts prompts like *"Spent 450 on dinner with friends at Swiggy"* into structured records with mandatory preview confirmation.
- **📑 Bank Statement CSV Import**: Bulk statement parser featuring automatic duplicate detection (date + merchant + amount matching).
- **💡 50/30/20 AI Budget Generator**: Recommends personalized budget allocations based on verified income and historical living expenses.
- **🎯 Goal Milestone Tracking**: Visual piggy banks with required monthly pace calculators and confetti celebrations upon completion.
- **📅 Subscription & Bill Calendar**: Audits recurring obligations, computes annualized load, and fires in-app alerts before renewals.

---

## 🏗️ Architecture & Philosophy

```
React (Vite + Tailwind CSS + Recharts + Lucide Icons)
                     │  (REST API / JWT Auth)
                     ▼
Node.js + Express.js API Gateway & Controllers
                     │
      ┌──────────────┴─────────────────────────┐
      ▼                                         ▼
Deterministic Calculation Engine          AI Service (Gemini API)
(Health Score, Safe-to-Spend,             (Natural Language Parser,
Forecasts, Anomaly Detection,             Conversational Coach,
What-If Simulations)                      Budget Recommendations)
      │                                         ▲
      │ (Pre-calculated ground-truth summaries) ┘
      ▼
MongoDB Atlas (Mongoose Models & Compound Indexes)
```

> **Core AI Principle: AI is NOT the source of truth.**
> All monetary calculations, burn rates, and health scores are executed deterministically on the backend. The AI service receives pre-calculated, anonymized summaries to provide explanations and advice, ensuring strict accuracy.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, React Router v7, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express.js, JSON Web Tokens (JWT), Bcrypt.js, Morgan.
- **Database**: MongoDB Atlas, Mongoose 8.x ODM.
- **AI Engine**: Google Gemini API integration with intelligent fallback heuristics.

---

## 📂 Project Structure

```
spendflow-ai/
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI Design System, Sidebar, Modals
│   │   ├── context/            # AuthContext, CurrencyContext, NotificationContext
│   │   ├── pages/              # Dashboard, Transactions, Budgets, Goals, Analytics, etc.
│   │   ├── services/           # api.js fetch client
│   │   ├── App.jsx             # React Router setup
│   │   ├── index.css           # Glassmorphism and design tokens
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/                     # Node.js + Express.js Backend
│   ├── config/                 # db.js MongoDB Atlas connection
│   ├── controllers/            # Auth, Transactions, Budgets, Goals, Analytics, AI, etc.
│   ├── middleware/             # JWT auth protection and error handler
│   ├── models/                 # User, Transaction, Income, Budget, SavingsGoal, etc.
│   ├── routes/                 # Express route definitions
│   ├── services/               # FinancialCalculationService, AIService, ForecastService, etc.
│   ├── server.js               # Express application entrypoint
│   └── package.json
├── .env.example
├── .gitignore
├── package.json                # Root orchestrator (concurrent dev launcher)
└── README.md
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account |
| `POST` | `/api/auth/login` | Authenticate user & return JWT |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/auth/onboarding` | Complete 5-step financial onboarding |
| `GET` | `/api/analytics/dashboard-summary` | Get full dashboard snapshot |
| `GET` | `/api/analytics/safe-to-spend` | Get safe discretionary daily allowance |
| `GET` | `/api/analytics/health-score` | Get deterministic 0–100 health score |
| `GET` | `/api/analytics/trends` | Cash flow trends over custom timeframes |
| `GET` | `/api/analytics/heatmap` | 90-day daily spending intensity data |
| `GET` | `/api/transactions` | Query transactions with search, filters & pagination |
| `POST` | `/api/transactions` | Create transaction with auto-categorization & anomaly check |
| `POST` | `/api/transactions/quick-nl-extract`| Parse natural language expense prompts |
| `POST` | `/api/transactions/csv-import` | Bulk CSV import with duplicate detection |
| `GET` | `/api/budgets` | Get category budgets with live burn rate |
| `POST` | `/api/budgets/ai-recommend` | Generate 50/30/20 budget recommendations |
| `GET` | `/api/goals` | List savings goals with required monthly pace |
| `POST` | `/api/goals/:id/contribute` | Deposit funds towards savings goal |
| `GET` | `/api/subscriptions` | List recurring subscriptions & renewal timeline |
| `POST` | `/api/what-if/simulate` | Deterministic financial scenario simulator |
| `POST` | `/api/ai/chat` | Context-grounded financial coach conversation |
| `POST` | `/api/ai/monthly-report` | Generate monthly executive AI financial report |
| `GET` | `/api/notifications` | Fetch smart in-app notifications |

---

## ⚙️ Environment Variables

Create `.env` inside `server/` (and root if running monolithically):

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/spendflow_ai?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
AI_API_KEY=your_gemini_api_key_here
AI_MODEL=gemini-1.5-flash
NODE_ENV=development
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster URI

### 2. Installation
```bash
# Clone repository
git clone https://github.com/VishalSudhaArul/SpendFlow.git
cd SpendFlow

# Install dependencies for both frontend and backend
npm install --prefix server
npm install --prefix client
```

### 3. Running Locally in Development
```bash
# Terminal 1: Backend Server (runs on port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (runs on port 5173 with API proxy)
cd client
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔒 Security Best Practices

- **Zero Secret Exposure**: Database connection strings, JWT keys, and AI credentials are kept exclusively in environment variables and never bundled into the client.
- **Password Salting & Hashing**: Handled via `bcryptjs` with 10 salt rounds.
- **Tenant Isolation**: Every database read/write query strictly checks authenticated `req.user._id`.
- **Sanitized Error Responses**: Production error handler strips stack traces and database internal messages.

---

## 📄 License
MIT License. Built for modern financial empowerment.
