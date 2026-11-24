import { describe, expect, it, jest } from '@jest/globals';

import {
  createUnusablePasswordHash,
  findClientByEmail,
  findClientByIdentity,
  insertClientCredential,
  linkIdentity,
  workerEmailExists
} from '../services/oauth_identity_service.js';

const createConnection = (rows = []) => ({
  execute: jest.fn().mockResolvedValue({ rows })
});

describe('findClientByIdentity', () => {
  it('returns the first row and queries by provider and sub', async () => {
    const connection = createConnection([{ ID: 7, SESSION_VERSION: 2 }]);

    const client = await findClientByIdentity(connection, 'GOOGLE', 'sub-1');

    expect(client).toEqual({ ID: 7, SESSION_VERSION: 2 });
    const [sql, binds] = connection.execute.mock.calls[0];
    expect(sql).toContain('OAUTH_IDENTITIES');
    expect(binds).toEqual({ provider: 'GOOGLE', providerUserId: 'sub-1' });
  });

  it('returns null when there is no linked client', async () => {
    expect(await findClientByIdentity(createConnection(), 'GOOGLE', 'sub-1')).toBeNull();
  });
});

describe('findClientByEmail', () => {
  it('returns the client matching the email', async () => {
    const connection = createConnection([{ ID: 3, SESSION_VERSION: 0 }]);

    expect(await findClientByEmail(connection, 'ana@gmail.com')).toEqual({ ID: 3, SESSION_VERSION: 0 });
    expect(connection.execute.mock.calls[0][1]).toEqual({ email: 'ana@gmail.com' });
  });

  it('returns null when the email is not registered', async () => {
    expect(await findClientByEmail(createConnection(), 'x@y.com')).toBeNull();
  });
});

describe('workerEmailExists', () => {
  it('is true when a worker has that email', async () => {
    expect(await workerEmailExists(createConnection([{ FOUND: 1 }]), 'a@b.com')).toBe(true);
  });

  it('is false otherwise', async () => {
    expect(await workerEmailExists(createConnection(), 'a@b.com')).toBe(false);
  });
});

describe('inserts', () => {
  it('links an identity with the given binds', async () => {
    const connection = createConnection();

    await linkIdentity(connection, 'GOOGLE', 'sub-1', 9);

    const [sql, binds] = connection.execute.mock.calls[0];
    expect(sql).toContain('INSERT INTO PI_DEVELOPERS.OAUTH_IDENTITIES');
    expect(binds).toEqual({ provider: 'GOOGLE', providerUserId: 'sub-1', idClient: 9 });
  });

  it('inserts the credential for the client', async () => {
    const connection = createConnection();

    await insertClientCredential(connection, 9, 'hash');

    const [sql, binds] = connection.execute.mock.calls[0];
    expect(sql).toContain('INSERT INTO PI_DEVELOPERS.CREDENTIALS');
    expect(binds).toEqual({ passwordHash: 'hash', idClient: 9 });
  });
});

describe('createUnusablePasswordHash', () => {
  it('returns a different bcrypt hash each time', async () => {
    const first = await createUnusablePasswordHash();
    const second = await createUnusablePasswordHash();

    expect(first).toMatch(/^\$2[aby]\$10\$/);
    expect(second).not.toBe(first);
  });
});