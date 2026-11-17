import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './auth.js';
import { authService } from '../services/authService.js';
import { onUnauthorized } from '../services/api.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  // Restore the session from the httpOnly cookie on first load.
  useEffect(() => {
    let cancelled = false;
    authService
      .me()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('guest');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any API call that finds the session expired signs the user out locally.
  useEffect(
    () =>
      onUnauthorized(() => {
        setUser(null);
        setStatus('guest');
      }),
    [],
  );

  const login = useCallback(async (credentials) => {
    const me = await authService.login(credentials);
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    const me = await authService.register(payload);
    setUser(me);
    setStatus('authenticated');
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('guest');
    }
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const me = await authService.updateProfile(payload);
    setUser(me);
    return me;
  }, []);

  const changePassword = useCallback((payload) => authService.changePassword(payload), []);

  // After deleting the account, a full reload onto the landing page clears every
  // bit of in-memory state (cached lists, notifications) belonging to it.
  const deleteAccount = useCallback(async (password) => {
    await authService.deleteAccount(password);
    window.location.replace('/welcome');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, updateProfile, changePassword, deleteAccount }),
    [user, status, login, register, logout, updateProfile, changePassword, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
