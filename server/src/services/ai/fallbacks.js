/**
 * Deterministic answers used when Gemini is not configured, unavailable, or
 * returns output that fails validation. They use the same server-computed
 * context, so the numbers are always correct, just less conversational.
 */
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  WANTS_CATEGORIES,
} from '../../constants/finance.js';
import { roundMoney } from '../../utils/money.js';
import { extractAmounts } from './context.js';

export function formatMoney(amount, currency = 'INR') {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

const DEFAULT_QUESTIONS = [
  'Where did most of my money go this month?',
  'How can I save ₹5,000 next month?',
  'Am I spending too much on food?',
];

function findCategory(text) {
  const lower = text.toLowerCase();
  const aliases = { food: 'Food & Dining', dining: 'Food & Dining', eating: 'Food & Dining', groceries: 'Groceries', grocery: 'Groceries', shopping: 'Shopping', transport: 'Transport', travel: 'Travel', rent: 'Rent & Housing', bills: 'Bills & Utilities', entertainment: 'Entertainment', subscriptions: 'Subscriptions', health: 'Health & Fitness' };
  for (const category of EXPENSE_CATEGORIES) if (lower.includes(category.toLowerCase())) return category;
  for (const [word, category] of Object.entries(aliases)) if (lower.includes(word)) return category;
  return null;
}

/** Rule-based coach reply for a question, from the financial context. */
export function fallbackChatReply(question, ctx) {
  const money = (n) => formatMoney(n, ctx.currency);
  const q = question.toLowerCase();
  const bareNumber = q.match(/\b(\d{3,7})\b/);
  const amount = extractAmounts(question)[0] ?? (bareNumber ? Number(bareNumber[1]) : null);
  const lines = [];

  if (/afford|buy|purchase/.test(q) && amount) {
    const safe = ctx.safeToSpend.amount;
    lines.push(`**Can you afford ${money(amount)}?**`);
    if (safe !== null && amount <= safe) {
      lines.push(`Yes, it fits: your safe-to-spend for the rest of this month is ${money(safe)}, after fixed costs, goal savings and a buffer.`);
    } else {
      lines.push(
        safe !== null
          ? `Not comfortably this month: safe-to-spend is ${money(safe)}, so this purchase would cut into planned savings or upcoming costs.`
          : 'There is not enough income data yet to judge this safely.',
      );
      const monthlySurplus = ctx.lastSixMonths.slice(0, -1).reduce((s, m) => s + m.net, 0) / Math.max(1, ctx.lastSixMonths.length - 1);
      if (monthlySurplus > 0) lines.push(`At your recent average surplus of ${money(monthlySurplus)}/month, saving for it would take about ${Math.ceil(amount / monthlySurplus)} month(s).`);
    }
    lines.push('For a full before/after comparison, try the What-If Simulator.');
  } else if (/save|saving|cut/.test(q) && amount) {
    const wants = ctx.typicalMonthlySpendingByCategory.filter((c) => WANTS_CATEGORIES.includes(c.category) && c.monthlyAverage > 0);
    const total = wants.reduce((s, c) => s + c.monthlyAverage, 0);
    lines.push(`**A plan to save ${money(amount)} next month**`);
    if (total <= 0) {
      lines.push('There is not enough spending history in flexible categories yet. Track a month of spending and ask again.');
    } else {
      const share = Math.min(1, amount / total);
      lines.push(`Your flexible ("wants") spending averages ${money(total)} a month. Trimming it by ${Math.round(share * 100)}% would do it:`);
      for (const c of wants.slice(0, 4)) lines.push(`- ${c.category}: cut about ${money(roundMoney(c.monthlyAverage * share))} (from ${money(c.monthlyAverage)})`);
      if (share >= 1) lines.push('That would mean cutting all flexible spending, so also look at fixed costs such as subscriptions.');
    }
  } else if (/where|most|spent|spend/.test(q) && !findCategory(q)) {
    const top = [...ctx.thisMonth.spendingByCategory].sort((a, b) => b.spentSoFar - a.spentSoFar).slice(0, 4);
    lines.push(`**This month so far you have spent ${money(ctx.thisMonth.spent)}.** The biggest categories:`);
    for (const c of top) lines.push(`- ${c.category}: ${money(c.spentSoFar)} (same days last month: ${money(c.sameDaysLastMonth)})`);
  } else if (findCategory(q)) {
    const category = findCategory(q);
    const now = ctx.thisMonth.spendingByCategory.find((c) => c.category === category);
    const typical = ctx.typicalMonthlySpendingByCategory.find((c) => c.category === category);
    const budget = ctx.budgets.find((b) => b.category === category);
    lines.push(`**${category}**`);
    lines.push(`- This month so far: ${money(now?.spentSoFar ?? 0)}`);
    if (typical) lines.push(`- Your typical month: ${money(typical.monthlyAverage)}`);
    if (budget) lines.push(`- Budget: ${money(budget.limit)} (${budget.status === 'over' ? 'over the limit' : `${money(budget.remaining)} left`})`);
    const pace = typical && now ? (now.spentSoFar / ctx.dayOfMonth) * ctx.daysInMonth : null;
    if (pace && typical) {
      lines.push(pace > typical.monthlyAverage * 1.1 ? `At this pace you would spend about ${money(pace)} — more than usual.` : 'You are within your usual range.');
    }
  } else if (/score|health/.test(q)) {
    lines.push(`**Your financial health score is ${ctx.healthScore.score ?? 'not available yet'}.**`);
    for (const f of ctx.healthScore.factors) lines.push(`- ${f.factor}: ${f.points === null ? 'not enough data' : `${f.points}/${f.maxPoints}`} — ${f.detail}`);
  } else if (/budget/.test(q)) {
    lines.push('**Budgets this month**');
    if (!ctx.budgets.length) lines.push('You have no budgets this month. The Budgets page can suggest some from your history.');
    for (const b of ctx.budgets) lines.push(`- ${b.category}: ${money(b.spent)} of ${money(b.limit)} (${b.status})`);
  } else {
    lines.push(`**${ctx.month} so far:** income ${money(ctx.thisMonth.income)}, spending ${money(ctx.thisMonth.spent)}, saved ${money(ctx.thisMonth.saved)}.`);
    if (ctx.safeToSpend.amount !== null) lines.push(`You can safely spend about ${money(ctx.safeToSpend.amount)} more this month (${money(ctx.safeToSpend.perDay)} a day).`);
    lines.push('Ask me about a category, a savings target or a purchase you are considering.');
  }

  return { reply: lines.join('\n'), suggestedQuestions: DEFAULT_QUESTIONS };
}

/** Rule-based dashboard summary. */
export function fallbackSummary(ctx) {
  const money = (n) => formatMoney(n, ctx.currency);
  const highlights = [];
  const top = [...ctx.thisMonth.spendingByCategory].sort((a, b) => b.spentSoFar - a.spentSoFar)[0];
  if (top) highlights.push(`${top.category} is your biggest expense this month at ${money(top.spentSoFar)}.`);
  const over = ctx.budgets.filter((b) => b.status === 'over');
  if (over.length) highlights.push(`${over.map((b) => b.category).join(', ')} ${over.length === 1 ? 'is' : 'are'} over budget.`);
  if (ctx.unusualExpenses[0]) highlights.push(`An unusual ${ctx.unusualExpenses[0].category} expense of ${money(ctx.unusualExpenses[0].amount)} stands out.`);

  const projected = ctx.thisMonth.projectedMonthEndSpending;
  const usual = ctx.thisMonth.usualMonthlySpending;
  let headline = `You've spent ${money(ctx.thisMonth.spent)} so far this month.`;
  if (projected && usual) {
    headline += projected > usual ? ` You're on pace to spend more than usual (${money(projected)}).` : ` You're on pace for ${money(projected)}, within your usual range.`;
  }
  const weakest = ctx.healthScore.factors.filter((f) => f.points !== null).sort((a, b) => a.points / a.maxPoints - b.points / b.maxPoints)[0];
  return {
    headline,
    highlights: highlights.slice(0, 3),
    tip: weakest ? `Biggest opportunity: ${weakest.factor.toLowerCase()} — ${weakest.detail.toLowerCase()}.` : 'Keep tracking your spending to unlock personalised tips.',
  };
}

// ---------- Natural-language transaction parsing ----------

const CATEGORY_KEYWORDS = [
  ['Groceries', /grocer|bigbasket|zepto|blinkit|instamart|kirana|vegetable|supermarket|dmart/],
  ['Food & Dining', /dinner|lunch|breakfast|food|restaurant|cafe|coffee|swiggy|zomato|pizza|burger|snack|tea|biryani|meal/],
  ['Transport', /uber|ola|rapido|metro|petrol|diesel|fuel|cab|taxi|auto|bus|train|parking|toll/],
  ['Subscriptions', /netflix|spotify|prime|hotstar|youtube premium|subscription/],
  ['Bills & Utilities', /electricity|water bill|gas bill|broadband|wifi|internet|recharge|phone bill|bill/],
  ['Rent & Housing', /\brent\b|maintenance|landlord/],
  ['Health & Fitness', /doctor|medicine|pharmacy|hospital|clinic|gym|fitness|apollo/],
  ['Entertainment', /movie|cinema|pvr|concert|game|gaming|bowling|party/],
  ['Travel', /flight|hotel|trip|holiday|vacation|airbnb|irctc/],
  ['Education', /course|book|tuition|fees|udemy|exam|college/],
  ['Personal Care', /haircut|salon|spa|skincare|laundry|grooming/],
  ['Gifts & Donations', /gift|donation|donate|charity/],
  ['Investments', /\bsip\b|mutual fund|stock|shares|invest/],
  ['EMI & Loans', /\bemi\b|loan/],
  ['Shopping', /amazon|flipkart|myntra|clothes|shirt|shoes|shopping|bought|purchase/],
];

const INCOME_KEYWORDS = [
  ['Salary', /salary|payroll|stipend/],
  ['Freelance', /freelance|client|project|gig/],
  ['Refund', /refund|cashback|reimburse/],
  ['Investments', /dividend|interest/],
  ['Rental', /rent received|tenant/],
  ['Gift', /gift/],
];

const METHOD_KEYWORDS = [
  ['UPI', /\bupi\b|gpay|google pay|phonepe|paytm|bhim/],
  ['Credit Card', /credit card|\bcc\b/],
  ['Debit Card', /debit card|\bcard\b/],
  ['Cash', /\bcash\b/],
  ['Net Banking', /net ?banking/],
  ['Wallet', /wallet/],
  ['Bank Transfer', /bank transfer|neft|imps|rtgs|transferred|credited/],
];

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function shiftDate(today, days) {
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Resolves "today", "yesterday", "3 days ago", "on monday", "12 nov", "12/11" relative to `today`. */
export function resolveDate(text, today) {
  const t = text.toLowerCase();
  if (/day before yesterday/.test(t)) return shiftDate(today, -2);
  if (/yesterday/.test(t)) return shiftDate(today, -1);
  const ago = t.match(/(\d+)\s+days?\s+ago/);
  if (ago) return shiftDate(today, -Number(ago[1]));
  const weekday = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`).test(t));
  if (weekday >= 0) {
    const current = new Date(`${today}T00:00:00.000Z`).getUTCDay();
    const diff = (current - weekday + 7) % 7 || 7; // most recent past occurrence
    return shiftDate(today, -diff);
  }
  const named = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/);
  const numeric = t.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  const year = Number(today.slice(0, 4));
  let candidate = null;
  if (named) candidate = { day: Number(named[1]), month: MONTHS.indexOf(named[2]) + 1 };
  else if (numeric) candidate = { day: Number(numeric[1]), month: Number(numeric[2]), year: numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : null };
  if (candidate && candidate.month >= 1 && candidate.month <= 12 && candidate.day >= 1 && candidate.day <= 31) {
    const y = candidate.year ?? year;
    let iso = `${y}-${String(candidate.month).padStart(2, '0')}-${String(candidate.day).padStart(2, '0')}`;
    if (!candidate.year && iso > today) iso = `${y - 1}-${iso.slice(5)}`; // "20 dec" in January means last year
    if (!Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())) return iso;
  }
  return today;
}

/** Deterministic parser: good enough for "450 dinner upi yesterday" style input. */
export function fallbackParseTransaction(text, today) {
  const lower = text.toLowerCase();
  const withoutDates = lower.replace(/\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b/g, ' ').replace(/\b\d+\s+days?\s+ago\b/g, ' ');
  const amounts = extractAmounts(withoutDates);
  const bare = withoutDates.match(/\b(\d+(?:,\d{2,3})*(?:\.\d{1,2})?)\b/);
  const amount = amounts[0] ?? (bare ? Number(bare[1].replace(/,/g, '')) : null);

  const isIncome = /\b(received|got paid|salary|credited|earned|refund|income|cashback|dividend)\b/.test(lower);
  const type = isIncome ? 'income' : 'expense';
  const table = isIncome ? INCOME_KEYWORDS : CATEGORY_KEYWORDS;
  const category = table.find(([, pattern]) => pattern.test(lower))?.[0] ?? 'Other';
  const paymentMethod = METHOD_KEYWORDS.find(([, pattern]) => pattern.test(lower))?.[0] ?? (isIncome ? 'Bank Transfer' : 'UPI');

  const description = text
    .replace(/(?:₹|rs\.?|inr)\s?[\d,]+(?:\.\d+)?/gi, '')
    .replace(/\b(i|spent|paid|on|for|using|via|with|by|yesterday|today|the|a|an|my|got|received|of)\b/gi, ' ')
    .replace(/\b(upi|gpay|cash|credit card|debit card|card|net ?banking|wallet)\b/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const missing = [];
  if (!amount) missing.push('amount');
  return {
    type,
    amount: amount ? roundMoney(amount) : null,
    category,
    description: description ? description.charAt(0).toUpperCase() + description.slice(1, 80) : category,
    paymentMethod,
    date: resolveDate(text, today),
    confidence: amount && category !== 'Other' ? 0.6 : 0.35,
    assumptions: ['Parsed with simple rules because the AI was unavailable — please check every field.'],
    missing,
  };
}

export const PARSE_ENUMS = {
  categories: [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])],
  paymentMethods: PAYMENT_METHODS,
};
