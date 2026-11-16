import * as income from '../services/incomeService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  sendSuccess(res, { items: await income.listIncomeSources(req.userId) });
}

export async function create(req, res) {
  const source = await income.createIncomeSource(req.userId, req.body);
  sendCreated(res, { source });
}

export async function update(req, res) {
  const source = await income.updateIncomeSource(req.userId, req.params.id, req.body);
  sendSuccess(res, { source });
}

export async function remove(req, res) {
  await income.deleteIncomeSource(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
}

export async function receive(req, res) {
  const result = await income.receiveIncome(req.userId, req.params.id, req.body);
  sendCreated(res, result);
}

export async function summary(req, res) {
  sendSuccess(res, await income.incomeSummary(req.userId, req.validatedQuery));
}
