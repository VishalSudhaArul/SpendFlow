import { request } from './api.js';

export const systemService = {
  getHealth: () => request({ method: 'GET', url: '/health' }),
};
