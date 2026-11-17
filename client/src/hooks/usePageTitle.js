import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "Budgets · SpendFlow AI". */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · SpendFlow AI` : 'SpendFlow AI — Personal finance, made clear';
  }, [title]);
}
