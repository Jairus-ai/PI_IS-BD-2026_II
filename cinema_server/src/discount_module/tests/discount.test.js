import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import discountRoutes from '../routes/discount_routes.js';


const MOCK_DISCOUNTS = [
  { ID_DISCOUNTS: 1, DISCOUNT_NAME: 'BIRTHDAY', DISCOUNT_PORCENTAGE: 30 },
  { ID_DISCOUNTS: 2, DISCOUNT_NAME: 'D.DAY', DISCOUNT_PORCENTAGE: 50 },
];

const MOCK_PRODUCTS = [
  { ID_SNACK: 1, SNACK_NAME: 'PALOMITAS' },
  { ID_SNACK: 2, SNACK_NAME: 'REFRESCO' },
];

const NEW_DISCOUNT = {
  DISCOUNT_NAME: 'NAVIDAD',
  DISCOUNT_PORCENTAGE: '15',
  DISCOUNT_START_DATE: '2026-12-01',
  DISCOUNT_FINISH_DATE: '2026-12-31',
  ID_FK_PRODUCT: 1,
};

function createMockConnection(responses = []) {
  const execute = jest.fn();
  for (const response of responses) {
    if (response instanceof Error) {
      execute.mockRejectedValueOnce(response);
    } else {
      execute.mockResolvedValueOnce(response);
    }
  }
  return { execute, close: jest.fn().mockResolvedValue() };
}

function useConnection(responses) {
  const connection = createMockConnection(responses);
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}


const app = express();
app.use(express.json());
app.use('/management/discounts', discountRoutes);
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

afterEach(() => {
  jest.restoreAllMocks();
});


describe('GET endpoints', () => {
  test.each([
    ['/management/discounts', MOCK_DISCOUNTS],
    ['/management/discounts/DP', MOCK_PRODUCTS],
  ])('%s 200 OK', async (path, rows) => {
    const connection = useConnection([{ rows }]);

    const response = await request(app)
      .get(path)
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toEqual(rows);
    expect(response.body.data).toHaveLength(2);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['/management/discounts'],
    ['/management/discounts/DP'],
  ])('%s 500 when the query fails', async (path) => {
    const connection = useConnection([
      new Error('ORA-00942: table or view does not exist'),
    ]);

    const response = await request(app).get(path).expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

describe('POST /management/discounts', () => {
  const post = () =>
    request(app).post('/management/discounts').send(NEW_DISCOUNT);

  test('Create discount 200 OK with the next id', async () => {
    const connection = useConnection([
      { rows: [{ LAST_ID: 121 }] },
      { rowsAffected: 1 },
    ]);

    const response = await post()
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(connection.execute).toHaveBeenCalledTimes(2);

    const [sql, binds, options] = connection.execute.mock.calls[1];
    expect(sql).toMatch(/INSERT INTO PI_DEVELOPERS\.DISCOUNTS/);
    expect(binds).toEqual({
      ID: 122,
      NAME: 'NAVIDAD',
      PORCENTAGE: 15,
      START_DATE: '2026-12-01',
      FINISH_DATE: '2026-12-31',
      PRODUCT: 1,
    });
    expect(options).toEqual({ autoCommit: true });
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('Create discount starts at id 1 when the table is empty', async () => {
    const connection = useConnection([
      { rows: [{ LAST_ID: null }] },
      { rowsAffected: 1 },
    ]);

    await post().expect(200);

    const [, binds] = connection.execute.mock.calls[1];
    expect(binds.ID).toBe(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('Create discount 500 when the insert fails', async () => {
    const connection = useConnection([
      { rows: [{ LAST_ID: 121 }] },
      new Error('ORA-00001: unique constraint violated'),
    ]);

    const response = await post().expect(500);

    expect(response.body.message).toMatch(/ORA-00001/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});