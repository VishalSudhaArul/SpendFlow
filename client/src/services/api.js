import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  timeout: 20_000,
  // The session lives in an httpOnly cookie, so the browser must send cookies.
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // Required by the API's CSRF guard on state-changing requests.
    'X-Requested-With': 'SpendFlow',
  },
});

/**
 * The backend always responds with { success, data } or { success: false, error }.
 * This turns any failure (HTTP error, network error, timeout) into one predictable
 * shape so pages can render error states without guessing.
 */
export function toApiError(error) {
  if (error?.isApiError) return error;

  const response = error?.response;
  const payload = response?.data?.error;

  let message = payload?.message;
  if (!message) {
    if (error?.code === 'ECONNABORTED') message = 'The server took too long to respond.';
    else if (!response) message = 'Cannot reach the SpendFlow server. Check that the API is running.';
    else message = 'Something went wrong. Please try again.';
  }

  return {
    isApiError: true,
    status: response?.status ?? 0,
    code: payload?.code ?? (response ? 'ERROR' : 'NETWORK_ERROR'),
    message,
    details: payload?.details ?? [],
  };
}

// Lets the auth layer react when any request finds the session has expired.
const unauthorizedListeners = new Set();
export function onUnauthorized(listener) {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    const url = error?.config?.url ?? '';
    // A 401 from login itself just means wrong credentials, not an expired session.
    if (apiError.status === 401 && !url.startsWith('/auth/login')) {
      unauthorizedListeners.forEach((listener) => listener(apiError));
    }
    return Promise.reject(apiError);
  },
);

/** Unwraps the `data` field of a successful response. */
export async function request(config) {
  const response = await api.request(config);
  return response.data.data;
}
