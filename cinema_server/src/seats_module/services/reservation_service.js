import {
  clearReservationCookie,
  readReservationToken
} from './reservation_cookie.js';

export async function discardReservation(connection, req, res) {
  const token = readReservationToken(req);

  if (!token)
    return;

  await connection.execute(
    `UPDATE PI_DEVELOPERS.RESERVATIONS
    SET RESERVED_UNTIL = SYSTIMESTAMP
    WHERE ID_RESERVATION = :reservationId
    AND RESERVED_UNTIL > SYSTIMESTAMP`,
    [token.reservationId],
    { autoCommit: true }
  );

  clearReservationCookie(res);
}
