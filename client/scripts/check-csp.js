// Fails the build if the inline theme script in index.html no longer matches the
// hash allowed by the Content-Security-Policy in vercel.json (it would be blocked
// in production and the page would flash the wrong theme).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const csp = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;

const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const missing = inline
  .map((code) => `sha256-${createHash('sha256').update(code).digest('base64')}`)
  .filter((hash) => !csp.includes(`'${hash}'`));

if (missing.length) {
  console.error(`[csp] Inline script hash not allowed by vercel.json CSP: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`[csp] ${inline.length} inline script(s) match the CSP in vercel.json`);
