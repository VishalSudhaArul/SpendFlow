import * as goals from '../services/goalService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  sendSuccess(res, await goals.listGoals(req.userId, req.validatedQuery));
}

export async function create(req, res) {
  sendCreated(res, { goal: await goals.createGoal(req.userId, req.body) });
}

export async function update(req, res) {
  sendSuccess(res, { goal: await goals.updateGoal(req.userId, req.params.id, req.body) });
}

export async function remove(req, res) {
  await goals.deleteGoal(req.userId, req.params.id);
  sendSuccess(res, { deleted: true });
}

export async function contribute(req, res) {
  sendCreated(res, await goals.addContribution(req.userId, req.params.id, req.body));
}

export async function removeContribution(req, res) {
  sendSuccess(res, { goal: await goals.removeContribution(req.userId, req.params.id, req.params.contributionId) });
}
