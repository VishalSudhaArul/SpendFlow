import { useCallback } from 'react';
import { useAuth } from '../context/auth.js';
import { formatCurrency } from '../utils/format.js';

/** Returns a formatter that uses the signed-in user's currency. */
export function useMoney() {
  const currency = useAuth().user?.currency ?? 'INR';
  return useCallback((amount, options) => formatCurrency(amount, currency, options), [currency]);
}
