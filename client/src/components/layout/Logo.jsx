import { Link } from 'react-router';

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-lg" aria-label="SpendFlow AI home">
      <span className="grid size-9 place-items-center rounded-xl brand-gradient shadow-[0_6px_18px_-6px_var(--accent-2)]">
        <svg viewBox="0 0 32 32" className="size-6" aria-hidden="true">
          <path d="M7 20.5c3.2 0 4.2-9 9-9s5.8 9 9 9" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[17px] font-extrabold tracking-tight">
        SpendFlow<span className="brand-text"> AI</span>
      </span>
    </Link>
  );
}
