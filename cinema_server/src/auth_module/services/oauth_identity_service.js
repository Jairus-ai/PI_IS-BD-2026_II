import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import oracledb from 'oracledb';

const HASH_SALT_ROUNDS = 10;

const FIND_CLIENT_SQL = `
  SELECT c.ID_CLIENT AS ID, cr.SESSION_VERSION
  FROM PI_DEVELOPERS.CLIENTS c
  JOIN PI_DEVELOPERS.CREDENTIALS cr ON cr.ID_CLIENT = c.ID_CLIENT
`;

const FIND_BY_IDENTITY_SQL = `
  ${FIND_CLIENT_SQL}
  JOIN PI_DEVELOPERS.OAUTH_IDENTITIES oi ON oi.ID_CLIENT = c.ID_CLIENT
  WHERE oi.PROVIDER = :provider AND oi.PROVIDER_USER_ID = :providerUserId
`;

const FIND_BY_EMAIL_SQL = `${FIND_CLIENT_SQL} WHERE c.EMAIL = :email`;

const WORKER_EMAIL_EXISTS_SQL = `
  SELECT 1 AS FOUND FROM PI_DEVELOPERS.WORKERS WHERE LOWER(EMAIL) = :email
`;

const INSERT_IDENTITY_SQL = `
  INSERT INTO PI_DEVELOPERS.OAUTH_IDENTITIES (PROVIDER, PROVIDER_USER_ID, ID_CLIENT)
  VALUES (:provider, :providerUserId, :idClient)
`;

const INSERT_CREDENTIAL_SQL = `
  INSERT INTO PI_DEVELOPERS.CREDENTIALS (HASH, ID_CLIENT)
  VALUES (:passwordHash, :idClient)
`;

async function findFirstRow(connection, sql, binds) {
  const result = await connection.execute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT
  });
  return result.rows[0] ?? null;
}

export function findClientByIdentity(connection, provider, providerUserId) {
  return findFirstRow(connection, FIND_BY_IDENTITY_SQL, { provider, providerUserId });
}

export function findClientByEmail(connection, email) {
  return findFirstRow(connection, FIND_BY_EMAIL_SQL, { email });
}

export async function workerEmailExists(connection, email) {
  const row = await findFirstRow(connection, WORKER_EMAIL_EXISTS_SQL, { email });
  return row !== null;
}

export async function linkIdentity(connection, provider, providerUserId, idClient) {
  await connection.execute(INSERT_IDENTITY_SQL, { provider, providerUserId, idClient });
}

export async function insertClientCredential(connection, idClient, passwordHash) {
  await connection.execute(INSERT_CREDENTIAL_SQL, { passwordHash, idClient });
}

export function createUnusablePasswordHash() {
  return bcrypt.hash(crypto.randomBytes(32).toString('hex'), HASH_SALT_ROUNDS);
}