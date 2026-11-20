import oracledb from 'oracledb';
import {
  getConnection,
  closeDatabaseConnection
} from '../../database/database.js';
import {
  clearReservationCookie,
  readReservationToken
} from '../../seats_module/services/reservation_cookie.js';
import { sendTicketsEmail } from '../../QR_module/controllers/QR_controller.js';
import { getStripe } from '../services/stripe_client.js';

const PAYMENT_CURRENCY = 'crc';
const CENTS_PER_COLON = 100;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const STRIPE_MINIMUM_SESSION_SECONDS = 31 * 60;

const PAYMENT_STATUS = {
  PAID: 'PAID',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING'
};

const INVALID_SIGNATURE_MESSAGE = 'La firma del webhook no es válida';
const RESERVATION_EXPIRED_CODE = 'RESERVATION_EXPIRED';
const RESERVATION_EXPIRED_MESSAGE = 'La reserva de asientos expiró. Selecciona tus asientos de nuevo';
const SESSION_ID_REQUIRED_MESSAGE = 'Falta el identificador del pago';
const PAYMENT_NOT_FOUND_MESSAGE = 'El pago no existe';

let stripeClient = null;

function getStripe() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey)
      throw new Error('STRIPE_SECRET_KEY is not defined in .env');

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function rejectExpiredReservation(res) {
  clearReservationCookie(res);

  return res.status(410).json({
    code: RESERVATION_EXPIRED_CODE,
    message: RESERVATION_EXPIRED_MESSAGE
  });
}

async function getReservedSeats(connection, reservationId) {
  const result = await connection.execute(
    `SELECT r.RESERVED_UNTIL, s.ID_SEAT, s.SEAT_ROW, s.SEAT_NUMBER, s.ID_SCREENING
    FROM PI_DEVELOPERS.RESERVATIONS r
    JOIN PI_DEVELOPERS.RESERVATIONS_SEATS rs
      ON rs.ID_RESERVATION = r.ID_RESERVATION
    JOIN PI_DEVELOPERS.SEATS s
      ON s.ID_SEAT = rs.ID_SEAT
      AND s.ID_SCREEN = rs.ID_SCREEN
      AND s.ID_SCREENING = rs.ID_SCREENING
    WHERE r.ID_RESERVATION = :reservationId
      AND r.RESERVED_UNTIL > SYSTIMESTAMP
    ORDER BY s.SEAT_ROW, s.SEAT_NUMBER`,
    [reservationId],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows;
}

async function getSeatsOnTime(connection, reservationId) {
  const result = await connection.execute(
    `SELECT rs.ID_SEAT, rs.ID_SCREEN, rs.ID_SCREENING
    FROM PI_DEVELOPERS.RESERVATIONS r
    JOIN PI_DEVELOPERS.RESERVATIONS_SEATS rs
      ON rs.ID_RESERVATION = r.ID_RESERVATION
    WHERE r.ID_RESERVATION = :reservationId
      AND r.RESERVED_UNTIL > SYSTIMESTAMP`,
    [reservationId],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows;
}

async function registerPurchase(connection, session, seats) {
  const reservationId = Number(session.metadata.reservationId);
  const feeId = Number(session.metadata.feeId);
  const seatPrice = Number(session.metadata.seatPrice);

  const receiptResult = await connection.execute(
    `INSERT INTO PI_DEVELOPERS.RECEIPTS (TOTAL_AMOUNT, STATUS, PAYMENT_TYPE, ID_CLIENT)
    VALUES (:totalAmount, 'PAID', :paymentType, :clientId)
    RETURNING ID_RECEIPT INTO :receiptId`,
    {
      totalAmount: session.amount_total / CENTS_PER_COLON,
      paymentType: session.payment_method_types?.[0]?.toUpperCase() ?? null,
      clientId: Number(session.metadata.clientId),
      receiptId: {
        dir: oracledb.BIND_OUT,
        type: oracledb.NUMBER
      }
    }
  );

  const receiptId = receiptResult.outBinds.receiptId[0];

  await connection.executeMany(
    `INSERT INTO PI_DEVELOPERS.SEAT_RECEIPTS (AMOUNT, ID_RECEIPT, ID_SEAT, ID_SCREEN, ID_SCREENING, ID_FEE)
    VALUES (:amount, :receiptId, :seatId, :screenId, :screeningId, :feeId)`,
    seats.map((seat) => ({
      amount: seatPrice,
      receiptId,
      seatId: seat.ID_SEAT,
      screenId: seat.ID_SCREEN,
      screeningId: seat.ID_SCREENING,
      feeId
    }))
  );

  await connection.execute(
    `DELETE FROM PI_DEVELOPERS.RESERVATIONS_SEATS
    WHERE ID_RESERVATION = :reservationId`,
    [reservationId]
  );

  await connection.execute(
    `UPDATE PI_DEVELOPERS.RESERVATIONS
    SET RESERVED_UNTIL = SYSTIMESTAMP
    WHERE ID_RESERVATION = :reservationId`,
    [reservationId]
  );

  return receiptId;
}

async function confirmPayment(session) {
  if (session.status === 'expired')
    return PAYMENT_STATUS.REJECTED;

  if (!session.payment_intent)
    return PAYMENT_STATUS.PENDING;

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent.id;
  let connection;
  let purchasedSeats;
  let receiptId;

  try {
    connection = await getConnection();

    await connection.execute(
      `SELECT ID_RESERVATION
      FROM PI_DEVELOPERS.RESERVATIONS
      WHERE ID_RESERVATION = :reservationId
      FOR UPDATE`,
      [Number(session.metadata.reservationId)]
    );

    const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded')
      return PAYMENT_STATUS.PAID;

    if (paymentIntent.status === 'canceled')
      return PAYMENT_STATUS.REJECTED;

    if (paymentIntent.status !== 'requires_capture')
      return PAYMENT_STATUS.PENDING;

    const seats = await getSeatsOnTime(connection, Number(session.metadata.reservationId));

    if (seats.length === 0) {
      await getStripe().paymentIntents.cancel(paymentIntentId);

      return PAYMENT_STATUS.REJECTED;
    }

    await registerPurchase(connection, session, seats);
    await getStripe().paymentIntents.capture(paymentIntentId);
    await connection.commit();

    purchasedSeats = seats;

  } finally {
    await closeDatabaseConnection(connection);
  }

  try {
    await sendTicketsEmail(
      Number(session.metadata.clientId),
      receiptId,
      purchasedSeats.map((seat) => ({
        screeningId: seat.ID_SCREENING,
        seatId: seat.ID_SEAT
      }))
    );

  } catch (error) {
    console.error(`Unable to send the tickets of checkout session ${session.id}: `, error.message);
  }

  return PAYMENT_STATUS.PAID;
}

export const getPaymentReservation = async (req, res, next) => {
  let connection;

  try {
    const token = readReservationToken(req);

    if (!token)
      return rejectExpiredReservation(res);

    connection = await getConnection();

    const seats = await getReservedSeats(connection, token.reservationId);

    if (seats.length === 0)
      return rejectExpiredReservation(res);

    res.status(200).json({
      data: {
        screeningId: seats[0].ID_SCREENING,
        reservedUntil: seats[0].RESERVED_UNTIL,
        seats: seats.map((seat) => ({
          id: seat.ID_SEAT,
          row: seat.SEAT_ROW,
          number: seat.SEAT_NUMBER
        }))
      }
    });

  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const createPaymentIntent = async (req, res, next) => {
  let connection;

  try {
    const token = readReservationToken(req);

    if (!token)
      return rejectExpiredReservation(res);

    connection = await getConnection();

    const seats = await getReservedSeats(connection, token.reservationId);

    if (seats.length === 0)
      return rejectExpiredReservation(res);

    const {
      feeId,
      seatPrice
    } = req.validatedBody;
    const metadata = {
      clientId: String(req.user.id),
      reservationId: String(token.reservationId),
      feeId: String(feeId),
      seatPrice: String(seatPrice)
    };

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: seats.map((seat) => ({
        price_data: {
          currency: PAYMENT_CURRENCY,
          product_data: { name: `Asiento ${seat.SEAT_ROW}${seat.SEAT_NUMBER}` },
          unit_amount: Math.round(seatPrice * CENTS_PER_COLON)
        },
        quantity: 1
      })),
      metadata,
      payment_intent_data: {
        capture_method: 'manual',
        metadata
      },
      expires_at: Math.floor(Date.now() / 1000) + STRIPE_MINIMUM_SESSION_SECONDS,
      success_url: `${CLIENT_ORIGIN}/#/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${CLIENT_ORIGIN}/#/payment/cancel`
    });

    res.status(201).json({
      data: {
        sessionId: session.id,
        url: session.url,
        expiresAt: seats[0].RESERVED_UNTIL
      }
    });

  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getPaymentStatus = async (req, res, next) => {
  try {
    const sessionId = req.query.session_id;

    if (typeof sessionId !== 'string' || sessionId.length === 0)
      return res.status(400).json({ message: SESSION_ID_REQUIRED_MESSAGE });

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (Number(session.metadata?.clientId) !== req.user.id)
      return res.status(404).json({ message: PAYMENT_NOT_FOUND_MESSAGE });

    const status = await confirmPayment(session);

    res.status(200).json({ data: { status } });

  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );

  } catch (error) {
    console.error('Stripe webhook error: ', error.message);

    return res.status(400).json({ message: INVALID_SIGNATURE_MESSAGE });
  }

  try {
    if (event.type === 'checkout.session.completed')
      await confirmPayment(event.data.object);

    res.status(200).json({ received: true });

  } catch (error) {
    next(error);
  }
};
