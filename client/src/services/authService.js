import { api, request } from './api.js';

export const authService = {
  me: () => request({ method: 'GET', url: '/auth/me' }).then((d) => d.user),
  login: (credentials) => request({ method: 'POST', url: '/auth/login', data: credentials }).then((d) => d.user),
  register: (payload) => request({ method: 'POST', url: '/auth/register', data: payload }).then((d) => d.user),
  logout: () => request({ method: 'POST', url: '/auth/logout' }),
  updateProfile: (payload) => request({ method: 'PATCH', url: '/users/me', data: payload }).then((d) => d.user),
  changePassword: (payload) => request({ method: 'PATCH', url: '/users/me/password', data: payload }),
  deleteAccount: (password) => request({ method: 'DELETE', url: '/users/me', data: { password, confirm: 'DELETE' } }),
  async exportData() {
    const response = await api.get('/users/me/export', { responseType: 'blob', timeout: 60_000 });
    const filename = /filename="([^"]+)"/.exec(response.headers['content-disposition'] ?? '')?.[1] ?? 'spendflow-export.json';
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
