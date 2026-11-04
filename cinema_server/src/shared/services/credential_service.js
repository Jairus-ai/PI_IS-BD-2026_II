import oracledb from 'oracledb';
import { ROLES } from '../../session/session.js';

export function getCredentialOwnerColumn(role) {
  return role === ROLES.CLIENT
    ? 'ID_CLIENT'
    : 'ID_WORKER';
}

export async function getCredential(
  connection,
  role,
  id
) {
  const ownerColumn = getCredentialOwnerColumn(role);

  const result = await connection.execute(
    `
      SELECT HASH, SESSION_VERSION
      FROM PI_DEVELOPERS.CREDENTIALS
      WHERE ${ownerColumn} = :id
    `,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0];
}

export async function updatePasswordAndSessionVersion(
  connection,
  role,
  id,
  passwordHash,
  currentSessionVersion
) {
  const ownerColumn = getCredentialOwnerColumn(role);

  const newSessionVersion =
    currentSessionVersion + 1;

  await connection.execute(
    `
      UPDATE PI_DEVELOPERS.CREDENTIALS
      SET HASH = :passwordHash,
          SESSION_VERSION = :sessionVersion
      WHERE ${ownerColumn} = :id
    `,
    {
      passwordHash,
      sessionVersion: newSessionVersion,
      id,
    }
  );

  return newSessionVersion;
}