import * as analytics from '../services/analyticsService.js';
import { getDashboard } from '../services/dashboardService.js';
import { sendSuccess } from '../utils/response.js';
import { toCsv } from '../utils/csv.js';

export async function dashboard(req, res) {
  sendSuccess(res, await getDashboard(req.userId));
}

export async function overview(req, res) {
  sendSuccess(res, await analytics.getAnalyticsOverview(req.userId, req.validatedQuery));
}

export async function heatmap(req, res) {
  sendSuccess(res, await analytics.getHeatmap(req.userId, req.validatedQuery));
}

export async function unusual(req, res) {
  sendSuccess(res, await analytics.getUnusualExpenses(req.userId, req.validatedQuery));
}

export async function cashflow(req, res) {
  sendSuccess(res, await analytics.getCashFlowProjection(req.userId, req.validatedQuery));
}

/**
 * CSV report for the selected range: one row per period, then one row per
 * category. A "Section" column keeps it a single, spreadsheet-friendly table.
 */
export async function report(req, res) {
  const data = await analytics.getAnalyticsOverview(req.userId, req.validatedQuery);
  const rows = [
    {
      section: 'Summary',
      label: `${data.range.from} to ${data.range.to}`,
      income: data.totals.income,
      expense: data.totals.expense,
      net: data.totals.net,
      extra: data.totals.savingsRate ?? '',
      count: data.totals.transactionCount,
    },
    ...data.series.map((b) => ({
      section: `By ${data.range.granularity}`,
      label: b.bucket,
      income: b.income,
      expense: b.expense,
      net: b.net,
      extra: b.income ? Math.round(((b.income - b.expense) / b.income) * 1000) / 10 : '',
      count: '',
    })),
    ...data.categories.map((c) => ({
      section: 'Expense category',
      label: c.category,
      income: '',
      expense: c.total,
      net: '',
      extra: c.share,
      count: c.count,
    })),
  ];

  const columns = [
    { header: 'Section', value: (r) => r.section },
    { header: 'Period / Category', value: (r) => r.label },
    { header: 'Income', value: (r) => r.income },
    { header: 'Expenses', value: (r) => r.expense },
    { header: 'Net', value: (r) => r.net },
    { header: 'Savings rate % / Share of spending %', value: (r) => r.extra },
    { header: 'Transactions', value: (r) => r.count },
  ];

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="spendflow-report-${data.range.from}-to-${data.range.to}.csv"`,
    'Cache-Control': 'no-store',
  });
  res.send(toCsv(columns, rows));
}
