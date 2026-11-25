import oracledb from 'oracledb';

const OBJECT_FORMAT = { outFormat: oracledb.OUT_FORMAT_OBJECT };
//there is no fee selection yet, every ticket uses the General fee of the screening format
const GENERAL_FEE = 'G';
const SCREEN_TYPE_LABELS = { REG: 'Regular', VIP: 'VIP', IMAX: 'IMAX', '4DX': '4DX' };

export const SUMMARY_ERRORS = {
  SCREENING_NOT_FOUND: { status: 404, message: 'La proyección ya no está disponible' },
  FEE_NOT_FOUND: { status: 409, message: 'No hay una tarifa vigente para el formato de la proyección' }
};

export class PurchaseSummaryError extends Error {
  constructor(code) {
    super(SUMMARY_ERRORS[code].message);
    this.code = code;
    this.status = SUMMARY_ERRORS[code].status;
  }
}

const RESERVED_SEATS_QUERY = `
  SELECT r.RESERVED_UNTIL, s.ID_SEAT, s.ID_SCREEN, s.SEAT_ROW, s.SEAT_NUMBER, s.ID_SCREENING
  FROM PI_DEVELOPERS.RESERVATIONS r
  JOIN PI_DEVELOPERS.RESERVATIONS_SEATS rs
    ON rs.ID_RESERVATION = r.ID_RESERVATION
  JOIN PI_DEVELOPERS.SEATS s
    ON s.ID_SEAT = rs.ID_SEAT
    AND s.ID_SCREEN = rs.ID_SCREEN
    AND s.ID_SCREENING = rs.ID_SCREENING
  WHERE r.ID_RESERVATION = :reservationId
    AND r.RESERVED_UNTIL > SYSTIMESTAMP
  ORDER BY s.SEAT_ROW, s.SEAT_NUMBER
`;

//CURRENT_TIMESTAMP and CURRENT_DATE use the session time zone (Costa Rica), SYSTIMESTAMP and SYSDATE use the server one (UTC)
const SCREENING_QUERY = `
  SELECT
    m.MOVIE_TITLE,
    l.LOCATION_NAME,
    sc.ID_SCREEN,
    sc.SCREEN_TYPE,
    s.ID_AUDIOVISUAL_FORMAT,
    vf.VIDEO_FORMAT_NAME || ' + ' || af.AUDIO_FORMAT_NAME AS MOVIE_FORMAT,
    s.ID_MOVIE_IN_BILLBOARD,
    TO_CHAR(s.SCREENING_DATE + s.SCREENING_START_TIME, 'YYYY-MM-DD"T"HH24:MI') AS SCREENING_DATE,
    TO_CHAR(CURRENT_TIMESTAMP, 'YYYY-MM-DD"T"HH24:MI') AS PURCHASE_DATE
  FROM PI_DEVELOPERS.SCREENINGS s
    JOIN PI_DEVELOPERS.AUDIOVISUAL_FORMATS avf ON avf.ID_AUDIOVISUAL_FORMAT = s.ID_AUDIOVISUAL_FORMAT
    JOIN PI_DEVELOPERS.VIDEO_FORMATS vf ON vf.ID_VIDEO_FORMAT = avf.ID_VIDEO_FORMAT
    JOIN PI_DEVELOPERS.AUDIO_FORMATS af ON af.ID_AUDIO_FORMAT = avf.ID_AUDIO_FORMAT
    JOIN PI_DEVELOPERS.SCREENS sc ON sc.ID_SCREEN = s.ID_SCREEN
    JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = sc.ID_LOCATION
    JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = s.ID_MOVIE_IN_BILLBOARD
    JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
  WHERE s.ID_SCREENING = :screeningId
    AND s.IS_DELETED = 0
`;

const FEE_QUERY = `
  SELECT ID_FEE, TYPE, AMOUNT
  FROM PI_DEVELOPERS.FEES
  WHERE TYPE = :feeType
    AND IS_DELETED = 0
    AND ID_AUDIOVISUAL_FORMAT = :formatId
  FETCH FIRST 1 ROWS ONLY
`;

//only movie discounts apply here, snacks are not part of the purchase flow yet
const DISCOUNTS_QUERY = `
  SELECT ID_DISCOUNT, DISCOUNT_NAME, DISCOUNT_PORCENTAGE
  FROM PI_DEVELOPERS.DISCOUNTS
  WHERE IS_DELETED = 0
    AND ID_MOVIE_IN_BILLBOARD = :movieInBillboardId
    AND TRUNC(CURRENT_DATE) BETWEEN TRUNC(DISCOUNT_START_DATE) AND TRUNC(DISCOUNT_FINISH_DATE)
  ORDER BY ID_DISCOUNT
`;

export function roundAmount(amount) {
  return Math.round(amount * 100) / 100;
}

/**
 * Each discount is taken from the price of every ticket, so the amount charged per seat and the
 * discount lines always add up to the same total.
 */
export function calculateTotals(feePrice, ticketCount, discounts) {
  let unitPrice = feePrice;
  const appliedDiscounts = [];

  for (const discount of discounts) {
    const perTicket = Math.min(roundAmount((feePrice * discount.DISCOUNT_PORCENTAGE) / 100), unitPrice);
    if (perTicket > 0) {
      unitPrice = roundAmount(unitPrice - perTicket);
      appliedDiscounts.push({
        discountId: discount.ID_DISCOUNT,
        name: discount.DISCOUNT_NAME,
        amount: roundAmount(perTicket * ticketCount)
      });
    }
  }

  return {
    unitPrice,
    discounts: appliedDiscounts,
    subtotal: roundAmount(feePrice * ticketCount),
    total: roundAmount(unitPrice * ticketCount)
  };
}

export async function getReservationSeats(connection, reservationId) {
  const result = await connection.execute(RESERVED_SEATS_QUERY, { reservationId }, OBJECT_FORMAT);
  return result.rows;
}

/**
 * Builds the purchase summary of a reservation with the prices stored in the database.
 * Returns null when the reservation expired or has no seats.
 */
export async function buildPurchaseSummary(connection, reservationId) {
  const seats = await getReservationSeats(connection, reservationId);
  if (seats.length === 0) {
    return null;
  }

  const screeningId = seats[0].ID_SCREENING;
  const screeningResult = await connection.execute(SCREENING_QUERY, { screeningId }, OBJECT_FORMAT);
  const screening = screeningResult.rows[0];
  if (!screening) {
    throw new PurchaseSummaryError('SCREENING_NOT_FOUND');
  }

  const feeResult = await connection.execute(
    FEE_QUERY,
    { feeType: GENERAL_FEE, formatId: screening.ID_AUDIOVISUAL_FORMAT },
    OBJECT_FORMAT
  );
  const fee = feeResult.rows[0];
  if (!fee) {
    throw new PurchaseSummaryError('FEE_NOT_FOUND');
  }

  const discountsResult = await connection.execute(
    DISCOUNTS_QUERY,
    { movieInBillboardId: screening.ID_MOVIE_IN_BILLBOARD },
    OBJECT_FORMAT
  );
  const totals = calculateTotals(fee.AMOUNT, seats.length, discountsResult.rows);

  return {
    screeningId,
    reservedUntil: seats[0].RESERVED_UNTIL,
    movieTitle: screening.MOVIE_TITLE,
    locationName: screening.LOCATION_NAME,
    screenName: `Sala ${screening.ID_SCREEN}`,
    screenType: SCREEN_TYPE_LABELS[screening.SCREEN_TYPE] ?? screening.SCREEN_TYPE,
    movieFormat: screening.MOVIE_FORMAT,
    screeningDate: screening.SCREENING_DATE,
    purchaseDate: screening.PURCHASE_DATE,
    ticketCount: seats.length,
    feeId: fee.ID_FEE,
    tickets: seats.map((seat) => ({
      seatId: seat.ID_SEAT,
      screenId: seat.ID_SCREEN,
      seat: `${seat.SEAT_ROW}${seat.SEAT_NUMBER}`,
      feeType: fee.TYPE,
      price: fee.AMOUNT
    })),
    snacks: [],
    ...totals
  };
}
