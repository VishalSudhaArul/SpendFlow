import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

/**
 * { user, status: 'loading' | 'authenticated' | 'guest', login, register, logout, updateProfile, changePassword }
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
