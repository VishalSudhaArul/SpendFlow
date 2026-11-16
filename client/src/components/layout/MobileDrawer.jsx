import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SidebarContent } from './Sidebar.jsx';

/** Slide-in navigation for screens narrower than `lg`. Built on <dialog> for focus trapping. */
export function MobileDrawer({ open, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label="Navigation menu"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-0 h-dvh max-h-none w-[min(18rem,85vw)] border-r border-border bg-surface p-0 text-text lg:hidden"
    >
      <div className="relative h-full">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3 z-10 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-text"
          aria-label="Close navigation menu"
        >
          <X className="size-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </dialog>
  );
}
