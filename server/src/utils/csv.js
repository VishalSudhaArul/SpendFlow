/**
 * Minimal RFC 4180 CSV writer with spreadsheet formula-injection protection.
 *
 * A cell that starts with = + - @ (or a tab/CR) can be executed as a formula
 * when the file is opened in Excel/Sheets, e.g. a transaction described as
 * `=HYPERLINK("http://evil", "click")`. Such text cells are prefixed with an
 * apostrophe so they are shown as plain text. Real numbers are left alone.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

export function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';

  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// Byte-order mark so Excel opens UTF-8 (₹, accented names) correctly.
export const UTF8_BOM = String.fromCharCode(0xfeff);

export function toCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvCell(column.header)).join(',');
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(column.value(row))).join(','));
  return `${UTF8_BOM}${[header, ...lines].join('\r\n')}\r\n`;
}
