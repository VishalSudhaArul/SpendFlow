import { describe, it, expect } from 'vitest';
import { connectDatabase, describeConnectionError, getDatabaseState } from '../src/config/db.js';

describe('database connection helpers', () => {
  it('refuses to connect without a connection string (no silent fallback)', async () => {
    await expect(connectDatabase({ uri: undefined })).rejects.toThrow(/MONGODB_URI is not set/);
    expect(getDatabaseState()).toBe('disconnected');
  });

  it.each([
    [{ message: 'bad auth : authentication failed' }, /Authentication failed/],
    [{ message: 'querySrv ENOTFOUND _mongodb._tcp.cluster0.abc.mongodb.net' }, /resolve the cluster address/],
    [{ name: 'MongooseServerSelectionError', message: 'Server selection timed out after 10000 ms' }, /Network Access/],
    [{ message: 'Invalid scheme, expected connection string to start with "mongodb://"' }, /not a valid connection string/],
    [{ name: 'WeirdError', message: 'something else' }, /Database connection failed \(WeirdError\)/],
  ])('maps driver errors to actionable messages (%#)', (error, expected) => {
    expect(describeConnectionError(error)).toMatch(expected);
  });

  it('never echoes credentials from the driver message', () => {
    const secretUri = 'mongodb+srv://user:SuperSecret123@cluster0.abc.mongodb.net';
    const text = describeConnectionError({ message: `failed to connect to ${secretUri}` });
    expect(text).not.toContain('SuperSecret123');
  });
});
