import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

import { getConnection, closeDatabaseConnection } from '../../database/database.js';

import { ROLES } from '../../session/session.js';

import { validateRecoveryRequest } from '../validators/password_recovery_validator.js';

const RECOVERY_CODE_MIN = 100000;
const RECOVERY_CODE_MAX = 999999;
const RECOVERY_CODE_EXPIRATION_MINUTES = 10;
const HASH_SALT_ROUNDS = 10;

function generateRecoveryCode() {
  return crypto.randomInt(
    RECOVERY_CODE_MIN,
    RECOVERY_CODE_MAX + 1
  ).toString();
}

async function findAccountByEmail(connection, email) {
  const result = await connection.execute(
    `
      SELECT
        ID_CLIENT AS ID,
        'CLIENT' AS ROLE
      FROM PI_DEVELOPERS.CLIENTS
      WHERE LOWER(EMAIL) = LOWER(:email)

      UNION ALL

      SELECT
        ID_WORKER AS ID,
        ROLE
      FROM PI_DEVELOPERS.WORKERS
      WHERE LOWER(EMAIL) = LOWER(:email)
        AND IS_ACTIVE = 1
    `,
    { email },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0];
}

async function saveRecoveryCode(connection, account, codeHash) {
  const isClient = account.ROLE === ROLES.CLIENT;

  const ownerColumn = isClient
    ? 'ID_CLIENT'
    : 'ID_WORKER';

  const existingCode = await connection.execute(
    `
      SELECT ID_CODE
      FROM PI_DEVELOPERS.CODES
      WHERE ${ownerColumn} = :id
    `,
    { id: account.ID },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (existingCode.rows.length > 0) {
    await connection.execute(
      `
        UPDATE PI_DEVELOPERS.CODES
        SET HASH = :hash,
            LAST_GENERATED_DATE = SYSTIMESTAMP
        WHERE ${ownerColumn} = :id
      `,
      {
        hash: codeHash,
        id: account.ID,
      }
    );

    return;
  }

  await connection.execute(
    `
      INSERT INTO PI_DEVELOPERS.CODES (
        HASH,
        LAST_GENERATED_DATE,
        ${ownerColumn}
      )
      VALUES (
        :hash,
        SYSTIMESTAMP,
        :id
      )
    `,
    {
      hash: codeHash,
      id: account.ID,
    }
  );
}

export const requestPasswordRecovery = async (req, res, next) => {
  const { errors, email } = validateRecoveryRequest(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;

  try {
    connection = await getConnection();

    const account = await findAccountByEmail(connection, email);

    if (!account) {
      return res.status(404).json({
        errors: {
          email: 'No existe una cuenta registrada con este correo',
        },
      });
    }

    const recoveryCode = generateRecoveryCode();

    const codeHash = await bcrypt.hash(
      recoveryCode,
      HASH_SALT_ROUNDS
    );

    await saveRecoveryCode(
      connection,
      account,
      codeHash
    );

    await connection.commit();

    console.log('Recovery code:', recoveryCode);

    return res.status(200).json({
      message:
        `Código de verificación generado. Tiene una vigencia de ${RECOVERY_CODE_EXPIRATION_MINUTES} minutos.`,
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};