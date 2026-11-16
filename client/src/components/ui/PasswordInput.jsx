import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export function PasswordInput({ className, ref, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input ref={ref} type={visible ? 'text' : 'password'} className={cn(className, 'pr-11')} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-text"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}
