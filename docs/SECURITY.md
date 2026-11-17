# Security overview

How SpendFlow AI protects accounts and financial data, and how each control is tested.
Paths are relative to `server/src` unless noted.

## Authentication and sessions

| Control | Implementation | Tested in |
|---|---|---|
| Password hashing | bcrypt, cost 12; 8–72 characters with a letter and a number (72 = bcrypt's limit, so nothing is silently truncated) | `tests/auth.unit.test.js`, `tests/integration/auth.test.js` |
| Session token | JWT (HS256 pinned, issuer + audience checked), user id and token version only — no personal data | `tests/auth.unit.test.js`, `tests/security.test.js` |
| Token storage | `httpOnly` cookie, `SameSite=Lax`, `Path=/api`, `Secure` in production — page JavaScript can never read it; `Authorization` headers are ignored | `tests/integration/security.test.js`, `tests/production.test.js` |
| Revocation | Password change increments a token version, invalidating every other session | `tests/integration/auth.test.js` |
| Forged tokens | Wrong secret, `alg: none`, wrong audience and expired tokens are rejected | `tests/security.test.js` |
| Account enumeration | Same error and similar timing for "unknown email" and "wrong password" (dummy bcrypt compare) | `tests/integration/auth.test.js` |
| Brute force | 20 failed login/register attempts per 15 min per IP; password change and account deletion share that limit | `tests/rateLimit.test.js` |
| Secret strength | Server refuses to start without `JWT_SECRET` ≥ 32 characters | `config/env.js`, `server.js` |

## Authorization and data isolation

- Every data route sits behind `requireAuth`; `tests/security.test.js` calls **all 63 protected endpoints** without a session and expects `401`.
- Every query is scoped by `userId`; single records load through `findOwnedOrThrow`, which returns the same `404` for "not yours" and "doesn't exist" (ids of other users' data can't be probed).
- `tests/integration/security.test.js` has a second user attack every resource type (read, update, delete, pay, contribute…) and checks the owner's data is untouched; each module's own integration tests repeat this.
- Mass assignment: request bodies are parsed by Zod schemas that drop unknown keys, so `userId`, `_id`, `passwordHash`, `tokenVersion` and server-only `origin` values can't be set by clients (tested).

## Input handling

- All params, queries and bodies are validated with Zod (`validators/`); invalid ids return `422`, never a database `CastError` (tested).
- NoSQL operator injection: bodies must match typed schemas (`{"$gt": ""}` is rejected), and Express 5's query parser never creates nested objects (tested).
- Search text is regex-escaped before querying and capped at 80 characters (no ReDoS).
- JSON bodies are capped at 100 kB (`413`, tested).
- CSV exports neutralise spreadsheet formula injection (`=`, `+`, `-`, `@`) and cap rows at 10,000 (`utils/csv.js`, tested).

## Transport and browser protections

- Helmet sets HSTS, `X-Content-Type-Options`, frame protection and a restrictive CSP on API responses; `X-Powered-By` is removed (tested).
- CORS allows only origins listed in `CLIENT_URL`, with credentials (tested).
- CSRF: state-changing requests must carry `X-Requested-With: SpendFlow`, which cross-site forms can't send and cross-origin scripts can't add without passing CORS (tested). Combined with `SameSite=Lax` cookies.
- The deployed client is served with its own strict Content-Security-Policy (no third-party scripts; the single inline theme script is allowed by hash), HSTS, `X-Frame-Options: DENY` and a permissions policy (`client/vercel.json`). The client build fails if the hash no longer matches (`client/scripts/check-csp.js`).
- The React client never uses `dangerouslySetInnerHTML`; AI replies are rendered by a tiny Markdown-to-elements renderer (`client/src/components/ai/MarkdownText.jsx`).

## Errors, logs and secrets

- Unexpected errors return a generic message; stack traces and internal messages never reach clients (tested with a message containing a fake connection string).
- Request logs record method, **path without query string**, status and timing — no bodies, cookies or headers.
- `/api/health` returns only status in production (tested); configuration flags are a development aid.
- Secrets live only in `server/.env` (git-ignored). The client receives only `VITE_API_URL`. Database errors are summarised without echoing the connection string.

## AI (Google Gemini)

- The API key is used only by `services/ai/geminiClient.js` on the server; it is never logged or returned.
- Gemini receives a compact **aggregated** summary built by `services/ai/context.js`: no name, email, ids, tokens, passwords or transaction notes. It never queries MongoDB.
- Prompts mark the data as data, not instructions. Replies must match a JSON schema (Zod-validated); a grounding check flags currency figures that don't trace back to the user's data, or that are garbled (badly grouped digits). Natural-language entry only produces a **draft** the user confirms.
- If Gemini is unavailable or misbehaves, deterministic fallbacks answer from the same numbers. AI routes are rate-limited (15/min).

## Privacy controls for users

- **Export**: `GET /api/users/me/export` downloads all of the account's data as JSON (without password hash or token data).
- **Delete**: `DELETE /api/users/me` (password + typing `DELETE`) permanently removes the account and every linked record; a test checks every collection with a `userId` is emptied for that user and other users are untouched.

## Dependencies

`npm audit` reports 0 known vulnerabilities in both `server` and `client` (checked during Phase 12).

## Known limitations / next steps

- Rate limiting uses in-memory counters; with several server instances use a shared store (e.g. Redis).
- No email verification or password-reset email yet (would need an email provider).
- Reminders are in-app only (no email/push).
- The MongoDB Atlas IP access list is open (`0.0.0.0/0`) for development; restrict it to the hosting provider's egress IPs in production.
