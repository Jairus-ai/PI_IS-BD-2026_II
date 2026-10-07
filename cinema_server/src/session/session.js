import jwt from 'jsonwebtoken';

import { getConnection, closeDatabaseConnection } from '../database/database.js';

export const SESSION_COOKIE_NAME = 'session_token';
export const SESSION_DURATION_MINUTES = 30;

export const ROLES = {
  CLIENT: 'CLIENT',
  SUPERUSER: 'SUPERUSER',
  ADMINISTRATOR: 'ADMINISTRATOR',
  EMPLOYEE: 'EMPLOYEE'
};

export const WORKER_ROLES_BY_CODE = {
  S: ROLES.SUPERUSER,
  A: ROLES.ADMINISTRATOR,
  E: ROLES.EMPLOYEE
};

const SESSION_DURATION_MS = SESSION_DURATION_MINUTES * 60 * 1000;
const EXPIRED_SESSION_MESSAGE = 'La sesión expiró. Inicia sesión de nuevo';
const FORBIDDEN_MESSAGE = 'No tienes permiso para realizar esta acción';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in .env');
  }
  return secret;
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_MS
  };
}

function getCredentialOwnerColumn(role) {
  return role === ROLES.CLIENT ? 'ID_CLIENT' : 'ID_WORKER';
}

export function createSessionToken({ id, role, sessionVersion }) {
  return jwt.sign({ role, sessionVersion }, getJwtSecret(), {
    subject: String(id),
    expiresIn: `${SESSION_DURATION_MINUTES}m`
  });
}

export function readSessionToken(req) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return null;
  }

  const secret = getJwtSecret();
  try {
    const payload = jwt.verify(token, secret);
    return {
      id: Number(payload.sub),
      role: payload.role,
      sessionVersion: payload.sessionVersion
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(res, sessionToken) {
  res.cookie(SESSION_COOKIE_NAME, sessionToken, buildCookieOptions());
}

export function clearSessionCookie(res) {
  const { maxAge, ...cookieOptions } = buildCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
}

export async function getCurrentSessionVersion({ id, role }) {
  let connection;
  try {
    connection = await getConnection();
    const ownerColumn = getCredentialOwnerColumn(role);
    const result = await connection.execute(
      `SELECT SESSION_VERSION FROM PI_DEVELOPERS.CREDENTIALS WHERE ${ownerColumn} = :id`,
      { id }
    );
    return result.rows?.[0]?.[0] ?? null;
  } finally {
    await closeDatabaseConnection(connection);
  }
}

export async function invalidateSessions({ id, role }) {
  let connection;
  try {
    connection = await getConnection();
    const ownerColumn = getCredentialOwnerColumn(role);
    await connection.execute(
      `UPDATE PI_DEVELOPERS.CREDENTIALS SET SESSION_VERSION = SESSION_VERSION + 1 WHERE ${ownerColumn} = :id`,
      { id },
      { autoCommit: true }
    );
  } finally {
    await closeDatabaseConnection(connection);
  }
}

export function requireSession(allowedRoles = Object.values(ROLES)) {
  return async (req, res, next) => {
    const session = readSessionToken(req);
    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ message: EXPIRED_SESSION_MESSAGE });
    }

    try {
      const currentSessionVersion = await getCurrentSessionVersion(session);
      if (currentSessionVersion !== session.sessionVersion) {
        clearSessionCookie(res);
        return res.status(401).json({ message: EXPIRED_SESSION_MESSAGE });
      }
    } catch (error) {
      return next(error);
    }

    if (!allowedRoles.includes(session.role)) {
      return res.status(403).json({ message: FORBIDDEN_MESSAGE });
    }

    req.user = session;
    setSessionCookie(res, createSessionToken(session));
    next();
  };
}
