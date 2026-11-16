/**
 * Development seed: creates ONE fictional demo account with ~6 months of
 * realistic data, so the UI can be explored without typing everything in.
 *
 * Usage:  npm run seed
 * Sign in with:  demo@spendflow.test / DemoPass123   (fictional test credentials)
 *
 * Safe to re-run: it only deletes and recreates data belonging to the demo
 * account, never anything else. Refuses to run with NODE_ENV=production.
 */
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Transaction } from '../src/models/Transaction.js';
import { IncomeSource } from '../src/models/IncomeSource.js';
import { hashPassword } from '../src/services/authService.js';
import { addDaysUtc, addMonthsUtc, startOfMonthUtc, todayUtc } from '../src/utils/dates.js';
import { roundMoney } from '../src/utils/money.js';

export const DEMO_EMAIL = 'demo@spendflow.test';
const DEMO_PASSWORD = 'DemoPass123';
const MONTHS = 6;

// Deterministic pseudo-random numbers so every seed produces the same data.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20261116);
const between = (min, max) => roundMoney(min + random() * (max - min));
const pick = (list) => list[Math.floor(random() * list.length)];

const DAILY_SPENDS = [
  { category: 'Food & Dining', items: ['Swiggy order', 'Zomato dinner', 'Café coffee', 'Lunch with team', 'Street food'], min: 120, max: 850, method: 'UPI' },
  { category: 'Groceries', items: ['BigBasket order', 'Local kirana store', 'Zepto groceries', 'Vegetable market'], min: 300, max: 2400, method: 'UPI' },
  { category: 'Transport', items: ['Uber ride', 'Metro recharge', 'Auto rickshaw', 'Petrol refill', 'Rapido bike'], min: 60, max: 1400, method: 'UPI' },
  { category: 'Shopping', items: ['Amazon order', 'Myntra clothes', 'Decathlon', 'Flipkart gadget accessory'], min: 499, max: 4200, method: 'Credit Card' },
  { category: 'Entertainment', items: ['PVR movie tickets', 'BookMyShow event', 'Bowling night', 'Gaming top-up'], min: 250, max: 1600, method: 'Credit Card' },
  { category: 'Health & Fitness', items: ['Apollo pharmacy', 'Doctor consultation', 'Protein powder'], min: 180, max: 2200, method: 'Debit Card' },
  { category: 'Personal Care', items: ['Haircut', 'Skincare products', 'Laundry service'], min: 150, max: 1200, method: 'UPI' },
];

const MONTHLY_FIXED = [
  { day: 3, category: 'Rent & Housing', description: 'Flat rent', amount: 22000, method: 'Bank Transfer' },
  { day: 7, category: 'Bills & Utilities', description: 'Electricity bill', range: [1100, 2300], method: 'UPI' },
  { day: 9, category: 'Bills & Utilities', description: 'Airtel broadband', amount: 799, method: 'Credit Card' },
  { day: 12, category: 'Subscriptions', description: 'Netflix', amount: 649, method: 'Credit Card' },
  { day: 12, category: 'Subscriptions', description: 'Spotify', amount: 119, method: 'Credit Card' },
  { day: 5, category: 'EMI & Loans', description: 'Laptop EMI', amount: 4500, method: 'Bank Transfer' },
  { day: 10, category: 'Investments', description: 'Mutual fund SIP', amount: 8000, method: 'Bank Transfer' },
];

async function seed() {
  if (env.isProduction) throw new Error('Refusing to seed a production environment.');

  await connectDatabase();
  console.log(`Seeding database "${env.MONGODB_DB_NAME}"...`);

  // Remove only the previous demo account and its data.
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    await Promise.all([
      Transaction.deleteMany({ userId: existing._id }),
      IncomeSource.deleteMany({ userId: existing._id }),
    ]);
    await existing.deleteOne();
  }

  const user = await User.create({
    name: 'Aarav Demo',
    email: DEMO_EMAIL,
    passwordHash: await hashPassword(DEMO_PASSWORD),
    currency: 'INR',
  });
  const userId = user._id;

  const today = todayUtc();
  const currentMonth = startOfMonthUtc(today);
  const firstMonth = addMonthsUtc(currentMonth, -(MONTHS - 1));

  const [salary, freelance] = await IncomeSource.create([
    { userId, name: 'Nimbus Labs salary', type: 'salary', expectedAmount: 85000, frequency: 'monthly', nextExpectedDate: addMonthsUtc(currentMonth, 1) },
    { userId, name: 'Freelance web projects', type: 'freelance', expectedAmount: 0, frequency: 'irregular' },
    { userId, name: 'Dividend income', type: 'investment', expectedAmount: 2400, frequency: 'quarterly', nextExpectedDate: addMonthsUtc(currentMonth, 2), isActive: true },
  ]);

  const docs = [];
  const add = (doc) => docs.push({ userId, origin: 'seed', notes: '', ...doc });

  for (let m = 0; m < MONTHS; m += 1) {
    const monthStart = addMonthsUtc(firstMonth, m);
    const daysInMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
    const dayDate = (day) => addDaysUtc(monthStart, day - 1);
    const isPast = (date) => date <= today;

    const salaryDate = dayDate(1);
    if (isPast(salaryDate)) {
      add({ type: 'income', amount: 85000, category: 'Salary', description: salary.name, paymentMethod: 'Bank Transfer', date: salaryDate, incomeSourceId: salary._id });
    }
    if (m % 2 === 1 && isPast(dayDate(18))) {
      add({ type: 'income', amount: between(9000, 22000), category: 'Freelance', description: 'Landing page project', paymentMethod: 'Bank Transfer', date: dayDate(18), incomeSourceId: freelance._id });
    }

    for (const fixed of MONTHLY_FIXED) {
      const date = dayDate(fixed.day);
      if (!isPast(date)) continue;
      add({
        type: 'expense',
        amount: fixed.amount ?? between(...fixed.range),
        category: fixed.category,
        description: fixed.description,
        paymentMethod: fixed.method,
        date,
      });
    }

    // Day-to-day spending; slightly heavier in the second-to-last month (festival season)
    // so analytics and anomaly detection have something to find.
    const count = m === MONTHS - 2 ? 34 : 26;
    for (let i = 0; i < count; i += 1) {
      const date = dayDate(1 + Math.floor(random() * daysInMonth));
      if (!isPast(date)) continue;
      const spend = pick(DAILY_SPENDS);
      add({
        type: 'expense',
        amount: between(spend.min, spend.max),
        category: spend.category,
        description: pick(spend.items),
        paymentMethod: spend.method,
        date,
      });
    }
  }

  // One clearly unusual purchase for later anomaly detection.
  const unusualDate = addDaysUtc(addMonthsUtc(currentMonth, -1), 20);
  add({ type: 'expense', amount: 38999, category: 'Shopping', description: 'New smartphone', paymentMethod: 'Credit Card', date: unusualDate });

  await Transaction.insertMany(docs);
  const income = docs.filter((d) => d.type === 'income').length;
  console.log(`✔ Demo account ready: ${DEMO_EMAIL} (password in server/scripts/seed.js)`);
  console.log(`  ${docs.length} transactions (${income} income, ${docs.length - income} expenses), 3 income sources`);
}

seed()
  .catch((error) => {
    console.error(`✖ Seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
