import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

import { getConnection, closeDatabaseConnection } from '../../database/database.js';

import { ROLES, WORKER_ROLES_BY_CODE, createSessionToken, setSessionCookie } from '../../session/session.js';
import { validateRecoveryRequest, validateRecoveryCode, validatePasswordReset } from '../validators/password_recovery_validator.js';
import { getCredential, updatePasswordAndSessionVersion, } from '../../shared/services/credential_service.js';

import emailService from '../../email/email_service.js';

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
            LAST_GENERATED_DATE = LOCALTIMESTAMP
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
        LOCALTIMESTAMP,
        :id
      )
    `,
    {
      hash: codeHash,
      id: account.ID,
    }
  );
}

async function findRecoveryCode(connection, account) {
  const ownerColumn =
    account.ROLE === ROLES.CLIENT
      ? 'ID_CLIENT'
      : 'ID_WORKER';

  const result = await connection.execute(
    `
      SELECT
        ID_CODE,
        HASH,
        LAST_GENERATED_DATE,
        CASE
          WHEN LAST_GENERATED_DATE < LOCALTIMESTAMP - INTERVAL '10' MINUTE
          THEN 1
          ELSE 0
        END AS IS_EXPIRED
      FROM PI_DEVELOPERS.CODES
      WHERE ${ownerColumn} = :id
    `,
    { id: account.ID },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0];
}

async function deleteRecoveryCode(
  connection,
  account
) {
  const ownerColumn =
    account.ROLE === ROLES.CLIENT
      ? 'ID_CLIENT'
      : 'ID_WORKER';

  await connection.execute(
    `
      DELETE FROM PI_DEVELOPERS.CODES
      WHERE ${ownerColumn} = :id
    `,
    { id: account.ID }
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

    await emailService.sendPasswordRecoveryEmail({
      email,
      recoveryCode,
      expirationMinutes: RECOVERY_CODE_EXPIRATION_MINUTES,
    });

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

export const verifyPasswordRecoveryCode = async (req, res, next) => {
  const {
    errors,
    email,
    code,
  } = validateRecoveryCode(req.body);

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

    const recoveryCode = await findRecoveryCode(
      connection,
      account
    );

    if (!recoveryCode) {
      return res.status(400).json({
        errors: {
          code: 'No existe un código de verificación activo',
        },
      });
    }

    if (recoveryCode.IS_EXPIRED === 1) {
      return res.status(400).json({
        errors: {
          code: 'El código de verificación ha expirado',
        },
      });
    }

    const codeMatches = await bcrypt.compare(
      code,
      recoveryCode.HASH
    );

    if (!codeMatches) {
      return res.status(400).json({
        errors: {
          code: 'El código de verificación es incorrecto',
        },
      });
    }

    return res.status(200).json({
      message: 'Código de verificación válido',
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const resetPassword = async (
  req,
  res,
  next
) => {
  const {
    errors,
    passwordSuggestions,
    email,
    code,
    newPassword,
  } = validatePasswordReset(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      errors,
      passwordSuggestions,
    });
  }

  let connection;

  try {
    connection = await getConnection();

    const account = await findAccountByEmail(
      connection,
      email
    );

    if (!account) {
      return res.status(404).json({
        errors: {
          email:
            'No existe una cuenta registrada con este correo',
        },
      });
    }

    const recoveryCode = await findRecoveryCode(
      connection,
      account
    );

    if (!recoveryCode) {
      return res.status(400).json({
        errors: {
          code:
            'No existe un código de verificación activo',
        },
      });
    }

    if (recoveryCode.IS_EXPIRED === 1) {
      return res.status(400).json({
        errors: {
          code:
            'El código de verificación ha expirado',
        },
      });
    }

    const codeMatches = await bcrypt.compare(
      code,
      recoveryCode.HASH
    );

    if (!codeMatches) {
      return res.status(400).json({
        errors: {
          code:
            'El código de verificación es incorrecto',
        },
      });
    }

    const passwordHash = await bcrypt.hash(
      newPassword,
      HASH_SALT_ROUNDS
    );

    const credential = await getCredential(
      connection,
      account.ROLE,
      account.ID
    );

    if (!credential) {
      return res.status(404).json({
        message:
          'No se encontraron credenciales para la cuenta',
      });
    }

    const newSessionVersion =
      await updatePasswordAndSessionVersion(
        connection,
        account.ROLE,
        account.ID,
        passwordHash,
        credential.SESSION_VERSION
      );

    await deleteRecoveryCode(
      connection,
      account
    );

    await connection.commit();

    await emailService.sendPasswordChangedEmail({
      email,
    });

    const role =
      account.ROLE === ROLES.CLIENT
        ? ROLES.CLIENT
        : WORKER_ROLES_BY_CODE[account.ROLE];

    const sessionToken = createSessionToken({
      id: account.ID,
      role,
      sessionVersion: newSessionVersion,
    });

    setSessionCookie(
      res,
      sessionToken
    );

    return res.status(200).json({
      message:
        'La contraseña ha sido cambiada correctamente',
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};