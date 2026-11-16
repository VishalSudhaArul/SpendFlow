import { api, request } from './api.js';

/** Converts filter state into API query params (arrays become comma lists, empty values are dropped). */
export function toQueryParams(filters = {}) {
  const params = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) params[key] = value.join(',');
    } else {
      params[key] = value;
    }
  }
  return params;
}

let metaPromise = null;

export const metaService = {
  /** Categories, payment methods, etc. Cached for the session. */
  get() {
    metaPromise ??= request({ method: 'GET', url: '/meta' }).catch((error) => {
      metaPromise = null;
      throw error;
    });
    return metaPromise;
  },
};

export const transactionService = {
  /** Returns { items, totals, meta } */
  async list(filters) {
    const response = await api.get('/transactions', { params: toQueryParams(filters) });
    return { ...response.data.data, meta: response.data.meta };
  },
  create: (data) => request({ method: 'POST', url: '/transactions', data }).then((d) => d.transaction),
  update: (id, data) => request({ method: 'PATCH', url: `/transactions/${id}`, data }).then((d) => d.transaction),
  remove: (id) => request({ method: 'DELETE', url: `/transactions/${id}` }),

  /** Downloads the filtered transactions as a CSV file. */
  async exportCsv(filters) {
    const { page: _page, limit: _limit, ...rest } = filters;
    const response = await api.get('/transactions/export', {
      params: toQueryParams(rest),
      responseType: 'blob',
      timeout: 60_000,
    });
    const disposition = response.headers['content-disposition'] ?? '';
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'spendflow-transactions.csv';
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export const budgetService = {
  overview: (month) => request({ method: 'GET', url: '/budgets', params: { month } }),
  recommendations: (month) => request({ method: 'GET', url: '/budgets/recommendations', params: { month } }),
  fiftyThirtyTwenty: (month, income) =>
    request({ method: 'GET', url: '/budgets/fifty-thirty-twenty', params: toQueryParams({ month, income }) }),
  save: (data) => request({ method: 'POST', url: '/budgets', data }).then((d) => d.budget),
  update: (id, data) => request({ method: 'PATCH', url: `/budgets/${id}`, data }).then((d) => d.budget),
  remove: (id) => request({ method: 'DELETE', url: `/budgets/${id}` }),
  bulk: (month, items) => request({ method: 'POST', url: '/budgets/bulk', data: { month, items } }),
  copy: (fromMonth, toMonth) => request({ method: 'POST', url: '/budgets/copy', data: { fromMonth, toMonth } }),
};

export const goalService = {
  list: () => request({ method: 'GET', url: '/goals' }),
  create: (data) => request({ method: 'POST', url: '/goals', data }).then((d) => d.goal),
  update: (id, data) => request({ method: 'PATCH', url: `/goals/${id}`, data }).then((d) => d.goal),
  remove: (id) => request({ method: 'DELETE', url: `/goals/${id}` }),
  contribute: (id, data) => request({ method: 'POST', url: `/goals/${id}/contributions`, data }),
  removeContribution: (id, contributionId) =>
    request({ method: 'DELETE', url: `/goals/${id}/contributions/${contributionId}` }).then((d) => d.goal),
};

export const incomeService = {
  listSources: () => request({ method: 'GET', url: '/income/sources' }).then((d) => d.items),
  createSource: (data) => request({ method: 'POST', url: '/income/sources', data }).then((d) => d.source),
  updateSource: (id, data) => request({ method: 'PATCH', url: `/income/sources/${id}`, data }).then((d) => d.source),
  removeSource: (id) => request({ method: 'DELETE', url: `/income/sources/${id}` }),
  receive: (id, data) => request({ method: 'POST', url: `/income/sources/${id}/receive`, data }),
  summary: (months = 6) => request({ method: 'GET', url: '/income/summary', params: { months } }),
};
