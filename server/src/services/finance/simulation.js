/**
 * What-If Simulator — pure, deterministic projection (no database, no AI).
 *
 * BASELINE ("a typical month"):
 *   income   = expected monthly income from active sources, else the average
 *              of the last 3 completed months
 *   spending = for each category, its median month over the last 3 completed
 *              months (so a one-off purchase doesn't distort the baseline)
 *
 * SCENARIOS (combinable, applied from the first projected month):
 *   category_change     { category, percent }            e.g. Food & Dining −15%
 *   income_change       { percent } or { amount }        e.g. +10% salary
 *   recurring_saving    { amount }                       e.g. set aside ₹2,000/month
 *   recurring_expense   { amount, label }                e.g. a new ₹999 subscription
 *   one_time_purchase   { amount, month, label, emiMonths?, annualInterestRate? }
 *
 * Each projected month:  net = income − spending;  balance += net.
 * Planned savings (recurring_saving) don't change net worth — they show how much
 * of the surplus is committed and whether the surplus can actually fund it.
 */
import { roundMoney } from '../../utils/money.js';

const r = roundMoney;

/** Standard EMI: P·i·(1+i)^n / ((1+i)^n − 1), with i the monthly rate. 0% → P/n. */
export function emi(principal, annualRatePercent, months) {
  if (months <= 1) return r(principal);
  const i = annualRatePercent / 12 / 100;
  if (i === 0) return r(principal / months);
  const factor = (1 + i) ** months;
  return r((principal * i * factor) / (factor - 1));
}

function savingsRate(income, expense) {
  return income > 0 ? Math.round(((income - expense) / income) * 1000) / 10 : null;
}

/** Applies recurring (every-month) scenario effects to the baseline month. */
export function applyRecurring(baseline, scenarios) {
  let income = baseline.income;
  const categories = Object.fromEntries(baseline.categories.map((c) => [c.category, c.amount]));
  const extra = [];
  let plannedSavings = 0;

  for (const s of scenarios) {
    if (s.type === 'income_change') {
      if (s.percent !== undefined) income += baseline.income * (s.percent / 100);
      if (s.amount !== undefined) income += s.amount;
    } else if (s.type === 'category_change') {
      const current = categories[s.category] ?? 0;
      categories[s.category] = Math.max(0, current * (1 + s.percent / 100));
    } else if (s.type === 'recurring_expense') {
      extra.push({ label: s.label || 'New recurring expense', amount: s.amount });
    } else if (s.type === 'recurring_saving') {
      plannedSavings += s.amount;
    }
  }

  const categoryList = Object.entries(categories).map(([category, amount]) => ({ category, amount: r(amount) }));
  const expense = r(categoryList.reduce((sum, c) => sum + c.amount, 0) + extra.reduce((sum, e) => sum + e.amount, 0));
  income = r(Math.max(0, income));
  return { income, expense, net: r(income - expense), categories: categoryList, extra, plannedSavings: r(plannedSavings) };
}

/** One-time costs per projected month (index 0 = first projected month), incl. EMI schedules. */
export function oneTimeSchedule(scenarios, months) {
  const schedule = Array.from({ length: months }, () => []);
  const purchases = [];
  for (const s of scenarios.filter((x) => x.type === 'one_time_purchase')) {
    const start = Math.min(Math.max(1, s.month ?? 1), months) - 1;
    const label = s.label || 'One-time purchase';
    if (s.emiMonths && s.emiMonths > 1) {
      const installment = emi(s.amount, s.annualInterestRate ?? 0, s.emiMonths);
      const total = r(installment * s.emiMonths);
      for (let k = 0; k < s.emiMonths && start + k < months; k += 1) {
        schedule[start + k].push({ label: `${label} (EMI ${k + 1}/${s.emiMonths})`, amount: installment });
      }
      purchases.push({ label, amount: s.amount, emiMonths: s.emiMonths, installment, totalPaid: total, interest: r(total - s.amount), startMonthIndex: start });
    } else {
      schedule[start].push({ label, amount: s.amount });
      purchases.push({ label, amount: s.amount, emiMonths: null, installment: null, totalPaid: s.amount, interest: 0, startMonthIndex: start });
    }
  }
  return { schedule, purchases };
}

/**
 * Runs the simulation.
 * @param baseline {income, categories:[{category, amount}]}
 * @param context  {startBalance, monthKeys[], budgets:{overall, categories:{[c]: limit}}, goalsRequiredMonthly, emergencyMonths}
 */
export function simulate({ baseline, scenarios, context }) {
  const months = context.monthKeys.length;
  const baseExpense = r(baseline.categories.reduce((s, c) => s + c.amount, 0));
  const base = { income: r(baseline.income), expense: baseExpense, net: r(baseline.income - baseExpense) };
  const sim = applyRecurring(baseline, scenarios);
  const { schedule, purchases } = oneTimeSchedule(scenarios, months);

  let baseBalance = context.startBalance;
  let simBalance = context.startBalance;
  let lowest = { balance: Infinity, month: null };
  const projection = context.monthKeys.map((month, i) => {
    const oneTime = r(schedule[i].reduce((s, item) => s + item.amount, 0));
    const simExpense = r(sim.expense + oneTime);
    const simNet = r(sim.income - simExpense);
    baseBalance = r(baseBalance + base.net);
    simBalance = r(simBalance + simNet);
    if (simBalance < lowest.balance) lowest = { balance: simBalance, month };
    return {
      month,
      baseline: { income: base.income, expense: base.expense, net: base.net, balance: baseBalance },
      simulated: { income: sim.income, expense: simExpense, net: simNet, balance: simBalance, oneTime, oneTimeItems: schedule[i] },
    };
  });

  // Category comparison (typical month, recurring effects only).
  const simByCategory = Object.fromEntries(sim.categories.map((c) => [c.category, c.amount]));
  const categories = baseline.categories
    .map((c) => ({ category: c.category, baseline: r(c.amount), simulated: r(simByCategory[c.category] ?? 0), change: r((simByCategory[c.category] ?? 0) - c.amount) }))
    .sort((a, b) => b.baseline - a.baseline);

  // Budget impact: typical simulated month against this month's limits.
  const budgetImpact = [];
  if (context.budgets?.overall) {
    budgetImpact.push(budgetLine('Overall', context.budgets.overall, base.expense, sim.expense));
  }
  for (const [category, limit] of Object.entries(context.budgets?.categories ?? {})) {
    budgetImpact.push(budgetLine(category, limit, baseline.categories.find((c) => c.category === category)?.amount ?? 0, simByCategory[category] ?? 0));
  }

  // Planned savings and goals are funded from the monthly surplus.
  const required = context.goalsRequiredMonthly ?? 0;
  const unallocated = r(sim.net - sim.plannedSavings);
  const goals = {
    requiredMonthly: r(required),
    baselineCoverage: coverage(base.net, required),
    simulatedCoverage: coverage(sim.net, required),
  };

  const emergencyFloor = r((context.emergencyMonths ?? 1) * sim.expense);
  const summary = {
    months,
    baselineEndBalance: baseBalance,
    simulatedEndBalance: simBalance,
    difference: r(simBalance - baseBalance),
    monthlyNetChange: r(sim.net - base.net),
    plannedSavingsTotal: r(sim.plannedSavings * months),
    oneTimeTotal: r(purchases.reduce((s, p) => s + p.totalPaid, 0)),
    interestTotal: r(purchases.reduce((s, p) => s + p.interest, 0)),
    lowestBalance: { amount: lowest.balance === Infinity ? context.startBalance : lowest.balance, month: lowest.month },
    goesNegative: lowest.balance < 0,
    dipsBelowEmergencyFloor: lowest.balance < emergencyFloor,
    emergencyFloor,
  };

  return {
    baseline: { ...base, savingsRate: savingsRate(base.income, base.expense) },
    simulated: {
      income: sim.income,
      expense: sim.expense,
      net: sim.net,
      savingsRate: savingsRate(sim.income, sim.expense),
      plannedSavings: sim.plannedSavings,
      unallocated,
      extraRecurring: sim.extra,
    },
    purchases,
    categories,
    budgetImpact,
    goals,
    projection,
    summary,
    insights: insightsFor({ base, sim, summary, purchases, unallocated, categories, goals }),
  };
}

function budgetLine(label, limit, baselineAmount, simulatedAmount) {
  const status = (amount) => (amount > limit ? 'over' : amount > limit * 0.9 ? 'tight' : 'ok');
  return {
    category: label,
    limit: r(limit),
    baseline: r(baselineAmount),
    simulated: r(simulatedAmount),
    baselineStatus: status(baselineAmount),
    simulatedStatus: status(simulatedAmount),
    remaining: r(limit - simulatedAmount),
  };
}

function coverage(net, required) {
  if (!required) return null;
  return Math.round(Math.max(0, Math.min(1, net / required)) * 1000) / 10;
}

/** Plain-language findings, each derived from a computed number above. */
function insightsFor({ base, sim, summary, purchases, unallocated, categories, goals }) {
  const fmt = (n) => `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
  const list = [];

  if (summary.monthlyNetChange !== 0) {
    list.push(
      `${summary.monthlyNetChange > 0 ? 'You would keep' : 'You would have'} ${fmt(summary.monthlyNetChange)} ${summary.monthlyNetChange > 0 ? 'more' : 'less'} each month (${fmt(sim.net)} vs ${fmt(base.net)} today).`,
    );
  }
  if (summary.difference !== 0) {
    list.push(`After ${summary.months} months your balance would be ${fmt(summary.difference)} ${summary.difference > 0 ? 'higher' : 'lower'} than if nothing changed.`);
  }
  const biggestCut = categories.filter((c) => c.change < 0).sort((a, b) => a.change - b.change)[0];
  if (biggestCut) list.push(`${biggestCut.category} drops from ${fmt(biggestCut.baseline)} to ${fmt(biggestCut.simulated)} a month.`);

  if (sim.plannedSavings > 0) {
    list.push(
      unallocated >= 0
        ? `Setting aside ${fmt(sim.plannedSavings)}/month fits: ${fmt(unallocated)} of surplus would still be unallocated.`
        : `Setting aside ${fmt(sim.plannedSavings)}/month needs ${fmt(unallocated)} more than your monthly surplus — trim spending to fund it.`,
    );
  }
  for (const p of purchases) {
    if (p.emiMonths) {
      list.push(`${p.label}: ${p.emiMonths} EMIs of ${fmt(p.installment)}${p.interest > 0 ? `, costing ${fmt(p.interest)} in interest` : ' at 0% interest'}.`);
    } else if (sim.net > 0) {
      list.push(`${p.label} equals about ${Math.ceil(p.amount / sim.net)} month(s) of your simulated surplus.`);
    }
  }
  if (summary.goesNegative) {
    list.push(`⚠ Your balance would go negative (${fmt(summary.lowestBalance.amount)}) around ${summary.lowestBalance.month}.`);
  } else if (summary.dipsBelowEmergencyFloor) {
    list.push(`⚠ Your balance would dip to ${fmt(summary.lowestBalance.amount)}, below one month of expenses (${fmt(summary.emergencyFloor)}).`);
  }
  if (goals.requiredMonthly && goals.simulatedCoverage !== goals.baselineCoverage) {
    list.push(`Your savings goals need ${fmt(goals.requiredMonthly)}/month; the surplus would cover ${goals.simulatedCoverage}% of that (now ${goals.baselineCoverage}%).`);
  }
  if (sim.net < 0) list.push('⚠ In this scenario you would spend more than you earn every month.');
  return list;
}
