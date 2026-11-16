import { ApiError } from './ApiError.js';

/**
 * Loads a document only if it belongs to the user. A record owned by someone
 * else gets the same 404 as a missing one, so ids of other users' data cannot
 * even be confirmed to exist.
 */
export async function findOwnedOrThrow(Model, id, userId, { label = 'Record', select } = {}) {
  const query = Model.findOne({ _id: id, userId });
  if (select) query.select(select);
  const doc = await query;
  if (!doc) throw ApiError.notFound(`${label} not found`);
  return doc;
}
