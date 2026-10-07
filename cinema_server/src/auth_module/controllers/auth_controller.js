import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { validateLogIn } from '../validators/auth_validator.js';
import {
  ROLES,
  WORKER_ROLES_BY_CODE,
  clearSessionCookie,
  createSessionToken,
  invalidateSessions,
  readSessionToken,
  setSessionCookie
} from '../../session/session.js';

const WRONG_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos';
const LOGGED_OUT_MESSAGE = 'Sesión cerrada correctamente';
const USER_NOT_FOUND_MESSAGE = 'La sesión expiró. Inicia sesión de nuevo';

// Compared when the email does not exist so the response takes the same time
const TIMING_PROTECTION_HASH = bcrypt.hashSync('timing-protection', 10);

const FIND_ACCOUNTS_BY_EMAIL_SQL = `
  SELECT c.ID_CLIENT AS ID, 'CLIENT' AS ROLE_CODE, c.EMAIL, c.FIRST_NAME, c.FIRST_SURNAME,
         cr.HASH, cr.SESSION_VERSION
  FROM PI_DEVELOPERS.CLIENTS c
  JOIN PI_DEVELOPERS.CREDENTIALS cr ON cr.ID_CLIENT = c.ID_CLIENT
  WHERE c.EMAIL = :email
  UNION ALL
  SELECT w.ID_WORKER AS ID, w.ROLE AS ROLE_CODE, w.EMAIL, w.FIRST_NAME, w.FIRST_SURNAME,
         cr.HASH, cr.SESSION_VERSION
  FROM PI_DEVELOPERS.WORKERS w
  JOIN PI_DEVELOPERS.CREDENTIALS cr ON cr.ID_WORKER = w.ID_WORKER
  WHERE w.EMAIL = :email AND w.IS_ACTIVE = 1
`;

const FIND_CLIENT_BY_ID_SQL = `
  SELECT ID_CLIENT AS ID, EMAIL, FIRST_NAME, FIRST_SURNAME
  FROM PI_DEVELOPERS.CLIENTS
  WHERE ID_CLIENT = :id
`;

const FIND_WORKER_BY_ID_SQL = `
  SELECT ID_WORKER AS ID, EMAIL, FIRST_NAME, FIRST_SURNAME
  FROM PI_DEVELOPERS.WORKERS
  WHERE ID_WORKER = :id AND IS_ACTIVE = 1
`;

function toRole(roleCode) {
  return roleCode === ROLES.CLIENT ? ROLES.CLIENT : WORKER_ROLES_BY_CODE[roleCode];
}

function toSessionUser(row, role) {
  return {
    id: row.ID,
    role,
    email: row.EMAIL,
    firstName: row.FIRST_NAME,
    firstSurname: row.FIRST_SURNAME
  };
}

async function findAccountByCredentials(connection, email, password) {
  const result = await connection.execute(
    FIND_ACCOUNTS_BY_EMAIL_SQL,
    { email },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows.length === 0) {
    await bcrypt.compare(password, TIMING_PROTECTION_HASH);
    return null;
  }

  for (const account of result.rows) {
    if (await bcrypt.compare(password, account.HASH)) {
      return account;
    }
  }
  return null;
}

export const logIn = async (req, res, next) => {
  const { errors, email, password } = validateLogIn(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;
  try {
    connection = await getConnection();
    const account = await findAccountByCredentials(connection, email, password);
    if (!account) {
      return res.status(401).json({ errors: { password: WRONG_CREDENTIALS_MESSAGE } });
    }

    const role = toRole(account.ROLE_CODE);
    const sessionToken = createSessionToken({
      id: account.ID,
      role,
      sessionVersion: account.SESSION_VERSION
    });

    setSessionCookie(res, sessionToken);
    res.status(200).json({ data: toSessionUser(account, role) });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const logOut = async (req, res, next) => {
  const session = readSessionToken(req);
  clearSessionCookie(res);
  try {
    if (session) {
      await invalidateSessions(session);
    }
    res.status(200).json({ message: LOGGED_OUT_MESSAGE });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const sql = req.user.role === ROLES.CLIENT ? FIND_CLIENT_BY_ID_SQL : FIND_WORKER_BY_ID_SQL;
    const result = await connection.execute(
      sql,
      { id: req.user.id },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (result.rows.length === 0) {
      clearSessionCookie(res);
      return res.status(401).json({ message: USER_NOT_FOUND_MESSAGE });
    }

    res.status(200).json({ data: toSessionUser(result.rows[0], req.user.role) });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
