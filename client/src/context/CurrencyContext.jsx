import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

const CurrencyContext = createContext(null);

const CURRENCY_MAP = {
  INR: { symbol: '₹', name: 'Indian Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  CAD: { symbol: 'CA$', name: 'Canadian Dollar' },
  AUD: { symbol: 'AU$', name: 'Australian Dollar' },
  SGD: { symbol: 'SG$', name: 'Singapore Dollar' },
  AED: { symbol: 'AED ', name: 'UAE Dirham' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
};

export const CurrencyProvider = ({ children }) => {
  const { user } = useAuth();
  const currencyCode = user?.currency || 'INR';
  const currencyMeta = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.INR;

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return `${currencyMeta.symbol}0`;
    return `${currencyMeta.symbol}${Number(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currencyCode, symbol: currencyMeta.symbol, formatCurrency, currencies: CURRENCY_MAP }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
