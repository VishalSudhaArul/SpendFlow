import { useAsync } from './useAsync.js';
import { metaService } from '../services/financeServices.js';

/** Categories, payment methods and other enums from the API (cached). */
export function useMeta() {
  return useAsync(() => metaService.get(), []);
}
