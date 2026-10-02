import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'session_token';
export const SESSION_DURATION_MINUTES = 30;

const SESSION_DURATION_MS = SESSION_DURATION_MINUTES * 60 * 1000;
const EXPIRED_SESSION_MESSAGE = 'La sesión expiró. Inicia sesión de nuevo';

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

export function createSessionToken({ id, role }) {
  return jwt.sign({ role }, getJwtSecret(), {
    subject: String(id),
    expiresIn: `${SESSION_DURATION_MINUTES}m`
  });
}

export function setSessionCookie(res, sessionToken) {
  res.cookie(SESSION_COOKIE_NAME, sessionToken, buildCookieOptions());
}

export function clearSessionCookie(res) {
  const { maxAge, ...cookieOptions } = buildCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
}

export function requireSession(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ message: EXPIRED_SESSION_MESSAGE });
  }

  const secret = getJwtSecret();
  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch (error) {
    clearSessionCookie(res);
    return res.status(401).json({ message: EXPIRED_SESSION_MESSAGE });
  }

  req.user = { id: Number(payload.sub), role: payload.role };
  setSessionCookie(res, createSessionToken(req.user));
  next();
}
