import * as budgets from '../services/budgetService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

const monthOf = (req) => req.validatedQuery?.month ?? budgets.currentMonthKey();

export async function overview(req, res) {
  sendSuccess(res, await budgets.getBudgetOverview(req.userId, monthOf(req)));
}

export async function create(req, res) {
  const budget = await budgets.upsertBudget(req.userId, req.body);
  sendCreated(res, { budget });
}

export async function update(req, res) {
  sendSuccess(res, { budget: await budgets.updateBudget(req.userId, req.params.id, req.body) });
}

export async function remove(req, res) {
  await budgets.deleteBudget(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
}

export async function bulk(req, res) {
  sendSuccess(res, { items: await budgets.bulkUpsertBudgets(req.userId, req.body) });
}

export async function copy(req, res) {
  sendSuccess(res, await budgets.copyBudgets(req.userId, req.body));
}

export async function recommendations(req, res) {
  sendSuccess(res, await budgets.getRecommendations(req.userId, monthOf(req)));
}

export async function fiftyThirtyTwenty(req, res) {
  sendSuccess(res, await budgets.getFiftyThirtyTwenty(req.userId, monthOf(req), req.validatedQuery));
}
