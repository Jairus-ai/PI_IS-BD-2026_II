import jwt from 'jsonwebtoken';

export const RESERVATION_COOKIE_NAME = 'reservation_token';
export const RESERVATION_DURATION_MINUTES = 5;

const RESERVATION_COOKIE_DURATION_MINUTES = 60;
const RESERVATION_COOKIE_DURATION_MS = RESERVATION_COOKIE_DURATION_MINUTES * 60 * 1000;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret)
    throw new Error('JWT_SECRET is not defined in .env');

  return secret;
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: RESERVATION_COOKIE_DURATION_MS
  };
}

export function createReservationToken({ reservationId, screeningId }) {
  return jwt.sign({ screeningId }, getJwtSecret(), {
    subject: String(reservationId),
    expiresIn: `${RESERVATION_COOKIE_DURATION_MINUTES}m`
  });
}

export function readReservationToken(req) {
  const token = req.cookies?.[RESERVATION_COOKIE_NAME];

  if (!token)
    return null;

  try {
    const payload = jwt.verify(token, getJwtSecret());

    return {
      reservationId: Number(payload.sub),
      screeningId: Number(payload.screeningId)
    };

  } catch {
    return null;
  }
}

export function setReservationCookie(res, reservationToken) {
  res.cookie(RESERVATION_COOKIE_NAME, reservationToken, buildCookieOptions());
}

export function clearReservationCookie(res) {
  const { maxAge, ...cookieOptions } = buildCookieOptions();

  res.clearCookie(RESERVATION_COOKIE_NAME, cookieOptions);
}
