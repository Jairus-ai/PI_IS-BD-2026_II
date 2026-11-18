import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

process.env.JWT_SECRET = 'test-secret';
process.env.STRIPE_SECRET_KEY = 'sk_test';

const mockCreateRefund = jest.fn();

jest.unstable_mockModule('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({
    refunds: { create: mockCreateRefund }
  }))
}));

const { default: purchaseRoutes } = await import('../routes/purchase_routes.js');
const {
  ROLES,
  SESSION_COOKIE_NAME,
  createSessionToken
} = await import('../../session/session.js');
process.env.STRIPE_SECRET_KEY = 'sk_test';

const mockCreateRefund = jest.fn();

jest.unstable_mockModule('stripe', () => ({
  default: jest.fn().mockImplementation(() => ({
    refunds: { create: mockCreateRefund }
  }))
}));

const { default: purchaseRoutes } = await import('../routes/purchase_routes.js');
const {
  ROLES,
  SESSION_COOKIE_NAME,
  createSessionToken
} = await import('../../session/session.js');

const SESSION_VERSION = 0;
const CLIENT_ID = 7;

const MOCK_HISTORY = [
  {
    ID_RECEIPT: 12,
    TOTAL_AMOUNT: 9000,
    RECEIPT_DATE: '2026-11-02T19:30',
    MOVIE_TITLE: 'Dune',
    SCREENING_DATE: '2026-11-30T20:00',
    IS_REFUNDED: 0,
    IS_REFUND_ON_TIME: 1
  },
  {
    ID_RECEIPT: 11,
    TOTAL_AMOUNT: 4500,
    RECEIPT_DATE: '2026-11-01T18:00',
    MOVIE_TITLE: 'Alien',
    SCREENING_DATE: '2026-11-03T18:00',
    IS_REFUNDED: 1,
    IS_REFUND_ON_TIME: 0
  }
];

const MOCK_SUMMARY = {
  ID_RECEIPT: 12,
  TOTAL_AMOUNT: 9000,
  RECEIPT_DATE: '2026-11-02T19:30',
  MOVIE_TITLE: 'Dune',
  LOCATION_NAME: 'San Pedro',
  SCREENING_DATE: '2026-11-05T20:00',
  IS_REFUNDED: 0
};
const MOCK_SEATS = [{ SEAT_ROW: 'F', SEAT_NUMBER: 5, FEE_TYPE: 'G', AMOUNT: 4500 }];
const MOCK_SNACKS = [{ SNACK_NAME: 'Palomitas', QUANTITY: 2, UNIT_PRICE: 2500 }];
const MOCK_DISCOUNTS = [{ DISCOUNT_NAME: 'Cumpleaños', DISCOUNT_AMOUNT: 1000 }];

const app = express();
app.use(cookieParser());
app.use('/purchases', purchaseRoutes);
app.use((error, req, res, next) => {
  res.status(500).json({ message: error.message });
});

function sessionCookie(role, id = CLIENT_ID) {
  const token = createSessionToken({ id, role, sessionVersion: SESSION_VERSION });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function mockDatabase(...controllerResponses) {
  const execute = jest.fn().mockResolvedValueOnce({ rows: [[SESSION_VERSION]] });
  for (const response of controllerResponses) {
    if (response instanceof Error) {
      execute.mockRejectedValueOnce(response);
    } else {
      execute.mockResolvedValueOnce(response);
    }
  }
  const connection = {
    execute,
    commit: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
  };
  const connection = {
    execute,
    commit: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
  };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

afterEach(() => {
  jest.restoreAllMocks();
  mockCreateRefund.mockReset();
  mockCreateRefund.mockReset();
});

describe('GET /purchases', () => {
  test('Returns the paid purchases of the client in session', async () => {
    const connection = mockDatabase({ rows: MOCK_HISTORY });

    const response = await request(app)
      .get('/purchases')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toEqual([
      {
        ...MOCK_HISTORY[0],
        IS_REFUNDED: false,
        IS_REFUND_ON_TIME: true
      },
      {
        ...MOCK_HISTORY[1],
        IS_REFUNDED: true,
        IS_REFUND_ON_TIME: false
      }
    ]);
    const [sql, binds] = connection.execute.mock.calls[1];
    expect(sql).toMatch(/r\.ID_CLIENT = :clientId/);
    expect(binds).toEqual({
      clientId: CLIENT_ID,
      minimumDays: 5
    });
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Returns an empty list when the client has no purchases', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app)
      .get('/purchases')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    await request(app)
      .get('/purchases')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(500);

    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Rejects a request without a session with 401', async () => {
    await request(app).get('/purchases').expect(401);
  });

  test.each([ROLES.EMPLOYEE, ROLES.ADMINISTRATOR, ROLES.SUPERUSER])('Rejects the %s role with 403', async (role) => {
    const connection = mockDatabase();

    await request(app)
      .get('/purchases')
      .set('Cookie', sessionCookie(role))
      .expect(403);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });
});

describe('GET /purchases/:id', () => {
  test('Returns the full detail of a purchase', async () => {
    const connection = mockDatabase(
      { rows: [MOCK_SUMMARY] },
      { rows: MOCK_SEATS },
      { rows: MOCK_SNACKS },
      { rows: MOCK_DISCOUNTS }
    );

    const response = await request(app)
      .get('/purchases/12')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(200);

    expect(response.body.data).toEqual({
      ...MOCK_SUMMARY,
      IS_REFUNDED: false,
      SEATS: MOCK_SEATS,
      SNACKS: MOCK_SNACKS,
      DISCOUNTS: MOCK_DISCOUNTS
    });
    expect(connection.execute.mock.calls[1][1]).toEqual({ purchaseId: 12, clientId: CLIENT_ID });
    expect(connection.execute.mock.calls[1][1]).toEqual({ purchaseId: 12, clientId: CLIENT_ID });
  });

  test('Marks a refunded purchase', async () => {
    mockDatabase({ rows: [{ ...MOCK_SUMMARY, IS_REFUNDED: 1 }] }, { rows: MOCK_SEATS }, { rows: [] }, { rows: [] });

    const response = await request(app)
      .get('/purchases/12')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(200);

    expect(response.body.data.IS_REFUNDED).toBe(true);
    expect(response.body.data.SNACKS).toEqual([]);
    expect(response.body.data.DISCOUNTS).toEqual([]);
  });

  test('Returns 404 when the purchase belongs to another client or does not exist', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app)
      .get('/purchases/99')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(2);
  });

  test('Returns 404 for an invalid purchase id without querying the purchase', async () => {
    const connection = mockDatabase();

    await request(app)
      .get('/purchases/abc')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Rejects a worker with 403', async () => {
    mockDatabase();

    await request(app)
      .get('/purchases/12')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(403);
  });
});

describe('POST /purchases/:id/refund', () => {
  const REFUND_ID = 3;
  const PAYMENT_INTENT_ID = 'pi_1';
  const RECEIPT_ROW = { rows: [{ ID_STRIPE_PAYMENT_INTENT: PAYMENT_INTENT_ID }] };
  const NOT_REFUNDED_ROW = { rows: [{ REFUNDS: 0 }] };
  const ON_TIME_ROW = { rows: [{ IS_PAST_REFUND_DEADLINE: 0 }] };
  const REFUND_INSERTED = { outBinds: { refundId: [REFUND_ID] } };

  test('Refunds a purchase whose screening is at least 5 days away', async () => {
    const connection = mockDatabase(RECEIPT_ROW, NOT_REFUNDED_ROW, ON_TIME_ROW, REFUND_INSERTED);

    const response = await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(201);

    expect(response.body.data).toEqual({
      ID_REFUND: REFUND_ID,
      ID_RECEIPT: 12
    });

    const [receiptSql, receiptBinds] = connection.execute.mock.calls[1];

    expect(receiptSql).toMatch(/FOR UPDATE/);
    expect(receiptBinds).toEqual({
      purchaseId: 12,
      clientId: CLIENT_ID
    });
    expect(connection.execute.mock.calls[3][1]).toEqual({
      purchaseId: 12,
      minimumDays: 5
    });

    const [insertSql, insertBinds] = connection.execute.mock.calls[4];

    expect(insertSql).toMatch(/INSERT INTO PI_DEVELOPERS\.REFUNDS/);
    expect(insertBinds).toMatchObject({ purchaseId: 12 });
    expect(mockCreateRefund).toHaveBeenCalledWith(
      { payment_intent: PAYMENT_INTENT_ID },
      { idempotencyKey: 'refund-receipt-12' }
    );
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(mockCreateRefund.mock.invocationCallOrder[0]).toBeLessThan(connection.commit.mock.invocationCallOrder[0]);
  });

  test('Returns 404 when the purchase belongs to another client or does not exist', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app)
      .post('/purchases/99/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(2);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 404 for an invalid purchase id without querying the purchase', async () => {
    const connection = mockDatabase();

    await request(app)
      .post('/purchases/abc/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Returns 409 when the purchase was already refunded', async () => {
    const connection = mockDatabase(RECEIPT_ROW, { rows: [{ REFUNDS: 1 }] });

    const response = await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(409);

    expect(response.body.code).toBe('REFUND_ALREADY_DONE');
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 422 when the screening is less than 5 days away', async () => {
    const connection = mockDatabase(RECEIPT_ROW, NOT_REFUNDED_ROW, { rows: [{ IS_PAST_REFUND_DEADLINE: 1 }] });

    const response = await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(422);

    expect(response.body.code).toBe('REFUND_TOO_LATE');
    expect(connection.execute).toHaveBeenCalledTimes(4);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 500 and closes the connection when the insert fails', async () => {
    const connection = mockDatabase(
      RECEIPT_ROW,
      NOT_REFUNDED_ROW,
      ON_TIME_ROW,
      new Error('ORA-00001: unique constraint violated')
    );

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(500);

    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Returns 500 without saving the refund when Stripe rejects it', async () => {
    const connection = mockDatabase(RECEIPT_ROW, NOT_REFUNDED_ROW, ON_TIME_ROW, REFUND_INSERTED);

    mockCreateRefund.mockRejectedValue(new Error('charge_already_refunded'));

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(500);

    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Does not call Stripe when the refund is rejected', async () => {
    mockDatabase(RECEIPT_ROW, { rows: [{ REFUNDS: 1 }] });

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(409);

    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  test('Rejects a worker with 403', async () => {
    mockDatabase();

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.EMPLOYEE))
      .expect(403);
  });
});

describe('POST /purchases/:id/refund', () => {
  const REFUND_ID = 3;
  const PAYMENT_INTENT_ID = 'pi_1';
  const RECEIPT_ROW = { rows: [{ ID_STRIPE_PAYMENT_INTENT: PAYMENT_INTENT_ID }] };
  const NOT_REFUNDED_ROW = { rows: [{ REFUNDS: 0 }] };
  const ON_TIME_ROW = { rows: [{ IS_PAST_REFUND_DEADLINE: 0 }] };
  const REFUND_INSERTED = { outBinds: { refundId: [REFUND_ID] } };

  test('Refunds a purchase whose screening is at least 5 days away', async () => {
    const connection = mockDatabase(RECEIPT_ROW, NOT_REFUNDED_ROW, ON_TIME_ROW, REFUND_INSERTED);

    const response = await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(201);

    expect(response.body.data).toEqual({
      ID_REFUND: REFUND_ID,
      ID_RECEIPT: 12
    });

    const [receiptSql, receiptBinds] = connection.execute.mock.calls[1];

    expect(receiptSql).toMatch(/FOR UPDATE/);
    expect(receiptBinds).toEqual({
      purchaseId: 12,
      clientId: CLIENT_ID
    });
    expect(connection.execute.mock.calls[3][1]).toEqual({
      purchaseId: 12,
      minimumDays: 5
    });

    const [insertSql, insertBinds] = connection.execute.mock.calls[4];

    expect(insertSql).toMatch(/INSERT INTO PI_DEVELOPERS\.REFUNDS/);
    expect(insertBinds).toMatchObject({ purchaseId: 12 });
    expect(mockCreateRefund).toHaveBeenCalledWith(
      { payment_intent: PAYMENT_INTENT_ID },
      { idempotencyKey: 'refund-receipt-12' }
    );
    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(mockCreateRefund.mock.invocationCallOrder[0]).toBeLessThan(connection.commit.mock.invocationCallOrder[0]);
  });

  test('Returns 404 when the purchase belongs to another client or does not exist', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app)
      .post('/purchases/99/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(2);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 404 for an invalid purchase id without querying the purchase', async () => {
    const connection = mockDatabase();

    await request(app)
      .post('/purchases/abc/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Returns 409 when the purchase was already refunded', async () => {
    const connection = mockDatabase(RECEIPT_ROW, { rows: [{ REFUNDS: 1 }] });

    const response = await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(409);

    expect(response.body.code).toBe('REFUND_ALREADY_DONE');
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 422 when the screening is less than 5 days away', async () => {
    const connection = mockDatabase(RECEIPT_ROW, NOT_REFUNDED_ROW, { rows: [{ IS_PAST_REFUND_DEADLINE: 1 }] });

    const response = await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(422);

    expect(response.body.code).toBe('REFUND_TOO_LATE');
    expect(connection.execute).toHaveBeenCalledTimes(4);
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 500 and closes the connection when the insert fails', async () => {
    const connection = mockDatabase(
      RECEIPT_ROW,
      NOT_REFUNDED_ROW,
      ON_TIME_ROW,
      new Error('ORA-00001: unique constraint violated')
    );

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(500);

    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Returns 500 without saving the refund when Stripe rejects it', async () => {
    const connection = mockDatabase(RECEIPT_ROW, NOT_REFUNDED_ROW, ON_TIME_ROW, REFUND_INSERTED);

    mockCreateRefund.mockRejectedValue(new Error('charge_already_refunded'));

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(500);

    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Does not call Stripe when the refund is rejected', async () => {
    mockDatabase(RECEIPT_ROW, { rows: [{ REFUNDS: 1 }] });

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(409);

    expect(mockCreateRefund).not.toHaveBeenCalled();
  });

  test('Rejects a worker with 403', async () => {
    mockDatabase();

    await request(app)
      .post('/purchases/12/refund')
      .set('Cookie', sessionCookie(ROLES.EMPLOYEE))
      .expect(403);
  });
});
