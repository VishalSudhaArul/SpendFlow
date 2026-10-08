const BASE_URL = '/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('spendflow_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('spendflow_token');
      localStorage.removeItem('spendflow_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    throw new Error(data.message || 'An error occurred during request');
  }

  return data;
};

export default apiFetch;
