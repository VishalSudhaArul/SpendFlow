import { request } from './api.js';

export const authService = {
  me: () => request({ method: 'GET', url: '/auth/me' }).then((d) => d.user),
  login: (credentials) => request({ method: 'POST', url: '/auth/login', data: credentials }).then((d) => d.user),
  register: (payload) => request({ method: 'POST', url: '/auth/register', data: payload }).then((d) => d.user),
  logout: () => request({ method: 'POST', url: '/auth/logout' }),
  updateProfile: (payload) => request({ method: 'PATCH', url: '/users/me', data: payload }).then((d) => d.user),
  changePassword: (payload) => request({ method: 'PATCH', url: '/users/me/password', data: payload }),
};
