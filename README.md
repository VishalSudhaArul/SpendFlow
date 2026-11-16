# SpendFlow AI

A full-stack personal finance platform: expense and income tracking, budgets, savings goals,
analytics, a what-if simulator, subscription management and a Gemini-powered financial coach.

> 🚧 In active development. A full README with screenshots and architecture notes comes with the final phase.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19 (JavaScript), Vite, Tailwind CSS 4, React Router, Axios, React Hook Form, Zod, Recharts, Lucide |
| Backend  | Node.js, Express 5, Mongoose, JWT, bcryptjs, Helmet, express-rate-limit, Zod |
| Database | MongoDB Atlas |
| AI       | Google Gemini via the official `@google/genai` SDK (backend only) |

## Project structure

```
SpendFlow-AI/
├── client/          React + Vite frontend
│   └── src/{components,pages,layouts,hooks,services,context,utils,assets}
└── server/          Express REST API
    ├── src/{config,controllers,middleware,models,routes,services,utils,validators}
    └── tests/
```

## Local setup (Windows PowerShell)

```powershell
# 1. Install dependencies
npm run install:all

# 2. Create local env files from the templates, then fill in server\.env
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env

# 3. Run the API (terminal 1) and the web app (terminal 2)
npm run dev:server
npm run dev:client
```

The web app runs at http://localhost:5173 and the API at http://localhost:5000/api.

## Scripts

| Command          | What it does |
|------------------|--------------|
| `npm run lint`   | ESLint for server and client |
| `npm test`       | Backend unit tests (Vitest + Supertest), no database needed |
| `npm run test:integration --prefix server` | API tests against a throwaway `spendflow-ai-test` database on your Atlas cluster |
| `npm run db:check --prefix server` | Verifies the MongoDB Atlas connection |
| `npm run seed --prefix server` | Creates (or resets) a fictional demo account with 6 months of data. Credentials are in `server/scripts/seed.js` |
| `npm run build`  | Production build of the client |

## Security notes

- Secrets live only in `server/.env`, which is git-ignored. The client only receives `VITE_API_URL`.
- The Gemini API key is used exclusively by the backend.
