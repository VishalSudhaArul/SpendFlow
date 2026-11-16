import { describe, it, expect } from 'vitest';
import { UTF8_BOM, escapeCsvCell, toCsv } from '../src/utils/csv.js';
import { addMonthsUtc, advanceByFrequency, isDateOnly, parseDateOnly, toDateOnly } from '../src/utils/dates.js';
import { roundMoney } from '../src/utils/money.js';
import { buildTransactionFilter } from '../src/services/transactionService.js';
import { monthlyEquivalent } from '../src/services/incomeService.js';
import { createTransactionSchema, listTransactionsQuery } from '../src/validators/transactionValidators.js';

describe('CSV export safety', () => {
  it.each([
    ['=HYPERLINK("http://evil","x")', `"'=HYPERLINK(""http://evil"",""x"")"`],
    ['+91 cmd', "'+91 cmd"],
    ['-2+3', "'-2+3"],
    ['@SUM(A1)', "'@SUM(A1)"],
    ['Dinner, with "friends"', '"Dinner, with ""friends"""'],
    ['Line\nbreak', '"Line\nbreak"'],
    ['Plain text', 'Plain text'],
  ])('escapes %j', (input, expected) => {
    expect(escapeCsvCell(input)).toBe(expected);
  });

  it('leaves real numbers (including negatives) as numbers', () => {
    expect(escapeCsvCell(-450.5)).toBe('-450.5');
    expect(escapeCsvCell(null)).toBe('');
  });

  it('writes a BOM, a header and CRLF rows', () => {
    const csv = toCsv([{ header: 'A', value: (r) => r.a }], [{ a: 1 }, { a: 'x' }]);
    expect(csv).toBe(`${UTF8_BOM}A\r\n1\r\nx\r\n`);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });
});

describe('date helpers', () => {
  it('validates real calendar dates only', () => {
    expect(isDateOnly('2026-02-28')).toBe(true);
    expect(isDateOnly('2026-02-30')).toBe(false);
    expect(isDateOnly('16-11-2026')).toBe(false);
  });

  it('clamps month arithmetic to the end of shorter months', () => {
    expect(toDateOnly(addMonthsUtc(parseDateOnly('2026-01-31'), 1))).toBe('2026-02-28');
    expect(toDateOnly(addMonthsUtc(parseDateOnly('2028-01-31'), 1))).toBe('2028-02-29');
    expect(toDateOnly(addMonthsUtc(parseDateOnly('2026-11-15'), -12))).toBe('2025-11-15');
  });

  it('advances by income frequency', () => {
    const start = parseDateOnly('2026-11-01');
    expect(toDateOnly(advanceByFrequency(start, 'weekly'))).toBe('2026-11-08');
    expect(toDateOnly(advanceByFrequency(start, 'quarterly'))).toBe('2027-02-01');
    expect(advanceByFrequency(start, 'irregular')).toBeNull();
  });
});

describe('money', () => {
  it('rounds to 2 decimals without float artifacts', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(1.005)).toBe(1.01);
  });

  it('normalizes income frequencies to a monthly figure', () => {
    expect(monthlyEquivalent({ isActive: true, expectedAmount: 1200, frequency: 'yearly' })).toBe(100);
    expect(monthlyEquivalent({ isActive: true, expectedAmount: 1000, frequency: 'weekly' })).toBe(4333.33);
    expect(monthlyEquivalent({ isActive: false, expectedAmount: 5000, frequency: 'monthly' })).toBe(0);
  });
});

describe('transaction filters and validation', () => {
  const userId = '65f000000000000000000001';

  it('always scopes the filter to the user and escapes search text', () => {
    const filter = buildTransactionFilter(userId, { search: 'a.*b', from: '2026-11-01', to: '2026-11-30' });
    expect(filter.userId.toString()).toBe(userId);
    expect(filter.$or[0].description.source).toBe('a\\.\\*b');
    expect(filter.date.$lte.toISOString()).toBe('2026-11-30T23:59:59.999Z');
  });

  it('rejects a category that does not match the type', () => {
    const result = createTransactionSchema.safeParse({
      type: 'income',
      amount: 100,
      category: 'Groceries',
      description: 'x',
      date: '2026-11-01',
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['category']);
  });

  it('rejects amounts with more than 2 decimals', () => {
    const result = createTransactionSchema.safeParse({
      type: 'expense',
      amount: 10.123,
      category: 'Groceries',
      description: 'x',
      date: '2026-11-01',
    });
    expect(result.success).toBe(false);
  });

  it('parses list filters from comma-separated query strings', () => {
    const result = listTransactionsQuery.parse({ category: 'Groceries,Transport', page: '2', minAmount: '10' });
    expect(result).toMatchObject({ category: ['Groceries', 'Transport'], page: 2, limit: 20, minAmount: 10 });
  });

  it('rejects reversed date ranges', () => {
    expect(listTransactionsQuery.safeParse({ from: '2026-11-30', to: '2026-11-01' }).success).toBe(false);
  });
});
