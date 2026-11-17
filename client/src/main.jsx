import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Dev-only accessibility tooling (open a page with ?a11y). Removed from production builds.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('a11y')) {
  import('./dev/a11yAudit.js').then((m) => m.installA11yAudit());
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
