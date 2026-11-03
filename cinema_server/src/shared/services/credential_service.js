import oracledb from 'oracledb';
import { ROLES } from '../../session/session.js';

export function getCredentialOwnerColumn(role) {
  return role === ROLES.CLIENT
    ? 'ID_CLIENT'
    : 'ID_WORKER';
}

export async function getCredential(connection, role, id) {
  const ownerColumn = getCredentialOwnerColumn(role);

  const result = await connection.execute(
    `
      SELECT HASH, SESSION_VERSION,
      IS_TEMPORARY_PASSWORD,
      TEMPORARY_PASSWORD_EXPIRATION,
      FROM PI_DEVELOPERS.CREDENTIALS
      WHERE ${ownerColumn} = :id
    `,
    { id },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0];
}

export async function updatePasswordAndSessionVersion(
  connection, role, id, passwordHash, currentSessionVersion) {
  const ownerColumn = getCredentialOwnerColumn(role);

  const newSessionVersion =
    currentSessionVersion + 1;

  await connection.execute(
    `
      UPDATE PI_DEVELOPERS.CREDENTIALS
      SET HASH = :passwordHash,
          SESSION_VERSION = :sessionVersion
          IS_TEMPORARY_PASSWORD = 0,
          TEMPORARY_PASSWORD_EXPIRATION = NULL
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

export async function createTemporaryCredential(connection, role, id, passwordHash) {
  const ownerColumn = getCredentialOwnerColumn(role);

  await connection.execute(
    `
      INSERT INTO PI_DEVELOPERS.CREDENTIALS (
        HASH,
        LAST_CHANGED_DATE,
        ${ownerColumn},
        SESSION_VERSION,
        IS_TEMPORARY_PASSWORD,
        TEMPORARY_PASSWORD_EXPIRATION
      )
      VALUES (
        :passwordHash,
        SYSDATE,
        :id,
        0,
        1,
        LOCALTIMESTAMP + INTERVAL '3' DAY
      )
    `,
    {
      passwordHash,
      id
    }
  );
}