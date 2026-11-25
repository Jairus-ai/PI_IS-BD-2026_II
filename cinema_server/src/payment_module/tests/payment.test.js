import {
  expect,
  jest
} from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

process.env.JWT_SECRET = 'test-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

const mockCreateSession = jest.fn();
const mockRetrieveSession = jest.fn();
const mockConstructEvent = jest.fn();
const mockRetrievePaymentIntent = jest.fn();
const mockCapturePaymentIntent = jest.fn();
const mockCancelPaymentIntent = jest.fn();
const mockSendTicketsEmail = jest.fn();

jest.unstable_mockModule('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: mockCreateSession,
        retrieve: mockRetrieveSession
      }
    },
    paymentIntents: {
      retrieve: mockRetrievePaymentIntent,
      capture: mockCapturePaymentIntent,
      cancel: mockCancelPaymentIntent
    },
    webhooks: { constructEvent: mockConstructEvent }
  }))
}));

jest.unstable_mockModule('../../QR_module/controllers/QR_controller.js', () => ({
  sendTicketsEmail: mockSendTicketsEmail
}));

const { default: paymentRoutes } = await import('../routes/payment_routes.js');
const { handleWebhook } = await import('../controllers/payment_controller.js');
const {
  ROLES,
  SESSION_COOKIE_NAME,
  createSessionToken
} = await import('../../session/session.js');
const {
  RESERVATION_COOKIE_NAME,
  createReservationToken
} = await import('../../seats_module/services/reservation_cookie.js');

const SCREENING = {
  MOVIE_TITLE: 'Inception',
  LOCATION_NAME: 'Oxígeno',
  ID_SCREEN: 1,
  SCREEN_TYPE: 'IMAX',
  ID_AUDIOVISUAL_FORMAT: 4,
  MOVIE_FORMAT: 'IMAX 3D + Dolby Atmos',
  ID_MOVIE_IN_BILLBOARD: 9,
  SCREENING_DATE: '2026-11-30T19:30',
  PURCHASE_DATE: '2026-11-24T18:05'
};

const GENERAL_FEE = { ID_FEE: 1, TYPE: 'G', AMOUNT: 4500 };

const MOVIE_DISCOUNT = { ID_DISCOUNT: 3, DISCOUNT_NAME: 'Martes de estreno', DISCOUNT_PORCENTAGE: 10 };

const RESERVED_UNTIL = new Date(Date.now() + 10 * 60 * 1000);

const RESERVED_SEATS = [
  {
    RESERVED_UNTIL,
    ID_SEAT: 21,
    ID_SCREEN: 1,
    SEAT_ROW: 'C',
    SEAT_NUMBER: 5,
    ID_SCREENING: 2
  },
  {
    RESERVED_UNTIL,
    ID_SEAT: 22,
    ID_SCREEN: 1,
    SEAT_ROW: 'C',
    SEAT_NUMBER: 6,
    ID_SCREENING: 2
  }
];

const RESERVATION_SEATS = [
  {
    ID_SEAT: 21,
    ID_SCREEN: 1,
    ID_SCREENING: 2
  },
  {
    ID_SEAT: 22,
    ID_SCREEN: 1,
    ID_SCREENING: 2
  }
];

function useDatabase({
  reservedSeats = RESERVED_SEATS,
  reservationSeats = RESERVATION_SEATS,
  screenings = [SCREENING],
  fees = [GENERAL_FEE],
  discounts = [],
  errors = {}
} = {}) {
  const execute = jest.fn(async (sql) => {
    if (/SESSION_VERSION/.test(sql))
      return { rows: [[0]] };

    if (/FROM PI_DEVELOPERS\.SCREENINGS/.test(sql))
      return { rows: screenings };

    if (/FROM PI_DEVELOPERS\.FEES/.test(sql))
      return { rows: fees };

    if (/FROM PI_DEVELOPERS\.DISCOUNTS/.test(sql))
      return { rows: discounts };

    if (/JOIN PI_DEVELOPERS\.SEATS/.test(sql))
      return { rows: reservedSeats };

    if (/INSERT INTO PI_DEVELOPERS\.RECEIPTS/.test(sql)) {
      if (errors.receipt)
        throw errors.receipt;

      return { outBinds: { receiptId: [50] } };
    }

    if (/FOR UPDATE/.test(sql))
      return { rows: [] };

    if (/RESERVATIONS_SEATS rs\s+ON/.test(sql))
      return { rows: reservationSeats };

    if (/DELETE FROM|UPDATE PI_DEVELOPERS\.RESERVATIONS/.test(sql))
      return { rowsAffected: 1 };

    throw new Error(`SQL inesperado en el test: ${sql}`);
  });

  const connection = {
    execute,
    executeMany: jest.fn().mockResolvedValue({ rowsAffected: 2 }),
    commit: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
  };

  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);

  return connection;
}

function cookies({
  role = ROLES.CLIENT,
  reservationId = 5
} = {}) {
  const session = createSessionToken({
    id: 7,
    role,
    sessionVersion: 0
  });
  const list = [`${SESSION_COOKIE_NAME}=${session}`];

  if (reservationId !== null) {
    const reservation = createReservationToken({
      reservationId,
      screeningId: 2
    });

    list.push(`${RESERVATION_COOKIE_NAME}=${reservation}`);
  }

  return list.join('; ');
}

function findCall(connection, pattern) {
  return connection.execute.mock.calls.find(([sql]) => pattern.test(sql));
}

function findReservationCookie(response) {
  return (response.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith(`${RESERVATION_COOKIE_NAME}=`));
}

function completedSession(overrides = {}) {
  return {
    id: 'cs_paid',
    status: 'complete',
    payment_intent: 'pi_1',
    amount_total: 900000,
    payment_method_types: ['card'],
    metadata: {
      clientId: '7',
      reservationId: '5',
      feeId: '1',
      seatPrice: '4500'
    },
    ...overrides
  };
}

function completedEvent(overrides = {}) {
  return {
    type: 'checkout.session.completed',
    data: { object: completedSession(overrides) }
  };
}

const app = express();
app.post('/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());
app.use(cookieParser());
app.use('/payments', paymentRoutes);
app.use((err, req, res, next) => {
  res.status(err.status ?? 500).json({ message: err.message });
});

let sessionCounter = 0;

beforeEach(() => {
  mockCreateSession.mockReset().mockImplementation(async () => {
    sessionCounter += 1;

    return {
      id: `cs_${sessionCounter}`,
      url: `https://checkout.stripe.test/cs_${sessionCounter}`
    };
  });
  mockRetrieveSession.mockReset().mockResolvedValue(completedSession());
  mockConstructEvent.mockReset();
  mockRetrievePaymentIntent.mockReset().mockResolvedValue({ status: 'requires_capture' });
  mockCapturePaymentIntent.mockReset().mockResolvedValue({ status: 'succeeded' });
  mockCancelPaymentIntent.mockReset().mockResolvedValue({ status: 'canceled' });
  mockSendTicketsEmail.mockReset().mockResolvedValue();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Only clients can pay', () => {
  test('401 without a session', async () => {
    await request(app).get('/payments/reservation').expect(401);
    await request(app).get('/payments/summary').expect(401);
    await request(app).post('/payments/intent').expect(401);
  });

  test.each([
    ROLES.EMPLOYEE,
    ROLES.ADMINISTRATOR,
    ROLES.SUPERUSER
  ])('403 for %s', async (role) => {
    useDatabase();

    await request(app)
      .post('/payments/intent')
      .set('Cookie', cookies({ role }))
      .expect(403);

    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});

describe('GET /payments/reservation', () => {
  test('200 returns the reserved seats and expiry', async () => {
    useDatabase();

    const response = await request(app)
      .get('/payments/reservation')
      .set('Cookie', cookies())
      .expect(200);

    expect(response.body.data).toEqual({
      screeningId: 2,
      reservedUntil: RESERVED_UNTIL.toISOString(),
      seats: [
        {
          id: 21,
          row: 'C',
          number: 5
        },
        {
          id: 22,
          row: 'C',
          number: 6
        }
      ]
    });
  });

  test('410 without a reservation cookie', async () => {
    useDatabase();

    const response = await request(app)
      .get('/payments/reservation')
      .set('Cookie', cookies({ reservationId: null }))
      .expect(410);

    expect(response.body.code).toBe('RESERVATION_EXPIRED');
  });

  test('410 and clears the cookie when the reservation expired', async () => {
    useDatabase({ reservedSeats: [] });

    const response = await request(app)
      .get('/payments/reservation')
      .set('Cookie', cookies())
      .expect(410);

    expect(findReservationCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe('GET /payments/summary', () => {
  test('200 returns the summary calculated with the database prices', async () => {
    useDatabase();

    const response = await request(app)
      .get('/payments/summary')
      .set('Cookie', cookies())
      .expect(200);

    expect(response.body.data).toEqual({
      screeningId: 2,
      reservedUntil: RESERVED_UNTIL.toISOString(),
      movieTitle: 'Inception',
      locationName: 'Oxígeno',
      screenName: 'Sala 1',
      screenType: 'IMAX',
      movieFormat: 'IMAX 3D + Dolby Atmos',
      screeningDate: '2026-11-30T19:30',
      purchaseDate: '2026-11-24T18:05',
      ticketCount: 2,
      feeId: 1,
      tickets: [
        { seatId: 21, screenId: 1, seat: 'C5', feeType: 'G', price: 4500 },
        { seatId: 22, screenId: 1, seat: 'C6', feeType: 'G', price: 4500 }
      ],
      snacks: [],
      unitPrice: 4500,
      discounts: [],
      subtotal: 9000,
      total: 9000
    });
  });

  test('applies the active discounts of the movie', async () => {
    useDatabase({ discounts: [MOVIE_DISCOUNT] });

    const response = await request(app)
      .get('/payments/summary')
      .set('Cookie', cookies())
      .expect(200);

    expect(response.body.data.discounts).toEqual([{ discountId: 3, name: 'Martes de estreno', amount: 900 }]);
    expect(response.body.data.subtotal).toBe(9000);
    expect(response.body.data.total).toBe(8100);
  });

  test('looks for the General fee of the screening format', async () => {
    const connection = useDatabase();

    await request(app).get('/payments/summary').set('Cookie', cookies()).expect(200);

    const [, binds] = findCall(connection, /FROM PI_DEVELOPERS\.FEES/);

    expect(binds).toEqual({ feeType: 'G', formatId: 4 });
  });

  test('410 without a reservation cookie', async () => {
    useDatabase();

    const response = await request(app)
      .get('/payments/summary')
      .set('Cookie', cookies({ reservationId: null }))
      .expect(410);

    expect(response.body.code).toBe('RESERVATION_EXPIRED');
  });

  test('The browser never caches the summary, not even an expired answer', async () => {
    useDatabase();

    const found = await request(app).get('/payments/summary').set('Cookie', cookies()).expect(200);
    const expired = await request(app).get('/payments/summary').set('Cookie', cookies({ reservationId: null })).expect(410);

    expect(found.headers['cache-control']).toBe('no-store');
    expect(expired.headers['cache-control']).toBe('no-store');
  });

  test('410 and clears the cookie when the reservation expired', async () => {
    useDatabase({ reservedSeats: [] });

    const response = await request(app)
      .get('/payments/summary')
      .set('Cookie', cookies())
      .expect(410);

    expect(findReservationCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  test('404 when the screening is no longer available', async () => {
    useDatabase({ screenings: [] });

    const response = await request(app).get('/payments/summary').set('Cookie', cookies()).expect(404);

    expect(response.body).toEqual({ code: 'SCREENING_NOT_FOUND', message: 'La proyección ya no está disponible' });
  });

  test('409 when there is no active fee for the format', async () => {
    useDatabase({ fees: [] });

    const response = await request(app).get('/payments/summary').set('Cookie', cookies()).expect(409);

    expect(response.body.code).toBe('FEE_NOT_FOUND');
  });
});

describe('POST /payments/intent', () => {
  test('201 creates a Stripe session with one line per seat', async () => {
    useDatabase();

    const response = await request(app)
      .post('/payments/intent')
      .set('Cookie', cookies())
      .expect(201);

    expect(response.body.data.url).toMatch(/^https:\/\/checkout\.stripe\.test\//);
    expect(response.body.data.expiresAt).toBe(RESERVED_UNTIL.toISOString());

    const [options] = mockCreateSession.mock.calls[0];

    expect(options.line_items.map((item) => item.price_data.product_data.name)).toEqual([
      'Asiento C5',
      'Asiento C6'
    ]);
    expect(options.line_items[0].price_data.unit_amount).toBe(450000);
    expect(options.payment_intent_data.capture_method).toBe('manual');
    expect(options.metadata).toEqual({
      clientId: '7',
      reservationId: '5',
      feeId: '1',
      seatPrice: '4500'
    });
  });

  test('ignores prices sent by the browser', async () => {
    useDatabase();

    await request(app)
      .post('/payments/intent')
      .set('Cookie', cookies())
      .send({ feeId: 99, seatPrice: 1 })
      .expect(201);

    const [options] = mockCreateSession.mock.calls[0];

    expect(options.line_items[0].price_data.unit_amount).toBe(450000);
    expect(options.metadata.seatPrice).toBe('4500');
  });

  test('charges the discounted price and keeps the discounts in the metadata', async () => {
    useDatabase({ discounts: [MOVIE_DISCOUNT] });

    await request(app).post('/payments/intent').set('Cookie', cookies()).expect(201);

    const [options] = mockCreateSession.mock.calls[0];

    expect(options.line_items[0].price_data.unit_amount).toBe(405000);
    expect(options.metadata).toMatchObject({ seatPrice: '4050', discounts: '3:900' });
  });

  test('uses the same idempotency key for the same reservation, so a double click reuses the session', async () => {
    useDatabase();

    await request(app).post('/payments/intent').set('Cookie', cookies()).expect(201);
    await request(app).post('/payments/intent').set('Cookie', cookies()).expect(201);

    const [[, firstOptions], [, secondOptions]] = mockCreateSession.mock.calls;

    expect(firstOptions.idempotencyKey).toBe(`checkout-5-21-22-${RESERVED_UNTIL.getTime()}`);
    expect(secondOptions.idempotencyKey).toBe(firstOptions.idempotencyKey);
  });

  test('410 and no Stripe session when the reservation expired', async () => {
    useDatabase({ reservedSeats: [] });

    const response = await request(app)
      .post('/payments/intent')
      .set('Cookie', cookies())
      .expect(410);

    expect(response.body.code).toBe('RESERVATION_EXPIRED');
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  test('409 and no Stripe session when there is no active fee', async () => {
    useDatabase({ fees: [] });

    await request(app).post('/payments/intent').set('Cookie', cookies()).expect(409);

    expect(mockCreateSession).not.toHaveBeenCalled();
  });
});

describe('POST /payments/webhook', () => {
  const sendWebhook = () => request(app)
    .post('/payments/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', 'signature')
    .send('{}');

  test('400 when the signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await sendWebhook().expect(400);
  });

  test('on time: writes the receipt, releases the reservation, captures and emails the tickets', async () => {
    const connection = useDatabase();

    mockConstructEvent.mockReturnValue(completedEvent());

    await sendWebhook().expect(200);

    const [, receiptBinds] = findCall(connection, /INSERT INTO PI_DEVELOPERS\.RECEIPTS/);

    expect(receiptBinds.totalAmount).toBe(9000);
    expect(receiptBinds.clientId).toBe(7);
    expect(receiptBinds.paymentType).toBe('CARD');
    expect(receiptBinds.paymentIntentId).toBe('pi_1');

    const [seatSql, seatRows] = connection.executeMany.mock.calls[0];

    expect(seatSql).toMatch(/INSERT INTO PI_DEVELOPERS\.SEAT_RECEIPTS/);
    expect(seatRows).toEqual([
      {
        amount: 4500,
        receiptId: 50,
        seatId: 21,
        screenId: 1,
        screeningId: 2,
        feeId: 1
      },
      {
        amount: 4500,
        receiptId: 50,
        seatId: 22,
        screenId: 1,
        screeningId: 2,
        feeId: 1
      }
    ]);
    expect(findCall(connection, /DELETE FROM PI_DEVELOPERS\.RESERVATIONS_SEATS/)).toBeDefined();
    expect(findCall(connection, /SET RESERVED_UNTIL = SYSTIMESTAMP/)).toBeDefined();
    expect(mockCapturePaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockCancelPaymentIntent).not.toHaveBeenCalled();
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(mockSendTicketsEmail).toHaveBeenCalledWith(7, 50, [
      {
        screeningId: 2,
        seatId: 21
      },
      {
        screeningId: 2,
        seatId: 22
      }
    ]);
  });

  test('stores the applied discounts of the purchase', async () => {
    const connection = useDatabase();

    mockConstructEvent.mockReturnValue(completedEvent({
      metadata: { ...completedSession().metadata, discounts: '3:900' }
    }));

    await sendWebhook().expect(200);

    const discountCall = connection.executeMany.mock.calls.find(([sql]) => /RECEIPT_DISCOUNTS/.test(sql));

    expect(discountCall[1]).toEqual([{ amount: 900, receiptId: 50, discountId: 3 }]);
  });

  test('the time is checked in the database, with the reservation row locked', async () => {
    const connection = useDatabase();

    mockConstructEvent.mockReturnValue(completedEvent());

    await sendWebhook().expect(200);

    const lockIndex = connection.execute.mock.calls.findIndex(([sql]) => /FOR UPDATE/.test(sql));
    const seatsIndex = connection.execute.mock.calls.findIndex(([sql]) => /RESERVATIONS_SEATS rs\s+ON/.test(sql));
    const [seatsSql] = connection.execute.mock.calls[seatsIndex];

    expect(lockIndex).toBeLessThan(seatsIndex);
    expect(seatsSql).toMatch(/r\.RESERVED_UNTIL > SYSTIMESTAMP/);
  });

  test('late: cancels the authorization and writes nothing', async () => {
    const connection = useDatabase({ reservationSeats: [] });

    mockConstructEvent.mockReturnValue(completedEvent());

    await sendWebhook().expect(200);

    expect(mockCancelPaymentIntent).toHaveBeenCalledWith('pi_1');
    expect(mockCapturePaymentIntent).not.toHaveBeenCalled();
    expect(findCall(connection, /INSERT INTO PI_DEVELOPERS\.RECEIPTS/)).toBeUndefined();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(mockSendTicketsEmail).not.toHaveBeenCalled();
  });

  test.each([
    'succeeded',
    'canceled'
  ])('a repeated event for a %s payment writes nothing', async (status) => {
    const connection = useDatabase();

    mockRetrievePaymentIntent.mockResolvedValue({ status });
    mockConstructEvent.mockReturnValue(completedEvent());

    await sendWebhook().expect(200);

    expect(findCall(connection, /INSERT INTO PI_DEVELOPERS\.RECEIPTS/)).toBeUndefined();
    expect(mockCapturePaymentIntent).not.toHaveBeenCalled();
    expect(mockCancelPaymentIntent).not.toHaveBeenCalled();
    expect(mockSendTicketsEmail).not.toHaveBeenCalled();
  });

  test('500 without commit or capture when the database fails, so Stripe retries', async () => {
    const connection = useDatabase({ errors: { receipt: new Error('ORA-01031: insufficient privileges') } });

    mockConstructEvent.mockReturnValue(completedEvent());

    await sendWebhook().expect(500);

    expect(mockCapturePaymentIntent).not.toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('500 without commit when the capture fails', async () => {
    const connection = useDatabase();

    mockCapturePaymentIntent.mockRejectedValue(new Error('capture failed'));
    mockConstructEvent.mockReturnValue(completedEvent());

    await sendWebhook().expect(500);

    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('a failing email does not undo the purchase', async () => {
    const connection = useDatabase();

    mockSendTicketsEmail.mockRejectedValue(new Error('SMTP down'));
    mockConstructEvent.mockReturnValue(completedEvent());

    await sendWebhook().expect(200);

    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('other events are acknowledged without touching the database', async () => {
    jest.spyOn(oracledb, 'getConnection');
    mockConstructEvent.mockReturnValue({
      type: 'checkout.session.expired',
      data: { object: completedSession() }
    });

    await sendWebhook().expect(200);

    expect(oracledb.getConnection).not.toHaveBeenCalled();
  });
});

describe('GET /payments/status', () => {
  const getStatus = (sessionId = 'cs_paid') => request(app)
    .get('/payments/status')
    .query({ session_id: sessionId })
    .set('Cookie', cookies());

  test('PAID after confirming an on-time payment', async () => {
    useDatabase();

    const response = await getStatus().expect(200);

    expect(response.body.data.status).toBe('PAID');
    expect(mockCapturePaymentIntent).toHaveBeenCalledWith('pi_1');
  });

  test('REJECTED when the reservation expired before the payment', async () => {
    useDatabase({ reservationSeats: [] });

    const response = await getStatus().expect(200);

    expect(response.body.data.status).toBe('REJECTED');
  });

  test('PENDING while the checkout is not completed', async () => {
    useDatabase();
    mockRetrieveSession.mockResolvedValue(completedSession({
      status: 'open',
      payment_intent: null
    }));

    const response = await getStatus().expect(200);

    expect(response.body.data.status).toBe('PENDING');
  });

  test('REJECTED when the checkout session expired', async () => {
    useDatabase();
    mockRetrieveSession.mockResolvedValue(completedSession({ status: 'expired' }));

    const response = await getStatus().expect(200);

    expect(response.body.data.status).toBe('REJECTED');
  });

  test('404 for a payment of another client', async () => {
    useDatabase();
    mockRetrieveSession.mockResolvedValue(completedSession({
      metadata: {
        ...completedSession().metadata,
        clientId: '8'
      }
    }));

    await getStatus().expect(404);

    expect(mockCapturePaymentIntent).not.toHaveBeenCalled();
  });

  test('400 without a session id', async () => {
    useDatabase();

    await request(app)
      .get('/payments/status')
      .set('Cookie', cookies())
      .expect(400);
  });
});
