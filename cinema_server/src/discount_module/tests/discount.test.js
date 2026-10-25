import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import discountRoutes from '../routes/discount_routes.js';

const MOCK_DISCOUNTS = [
  { ID_DISCOUNTS: 1, DISCOUNT_NAME: 'BIRTHDAY', DISCOUNT_PORCENTAGE: 30 },
  { ID_DISCOUNTS: 2, DISCOUNT_NAME: 'D.DAY', DISCOUNT_PORCENTAGE: 50 },
];

const MOCK_SNACKS = [
  { PRODUCT_ID: 1, PRODUCT_NAME: 'PALOMITAS' },
  { PRODUCT_ID: 2, PRODUCT_NAME: 'REFRESCO' },
];

const MOCK_MOVIES = [
  { PRODUCT_ID: 1, PRODUCT_NAME: 'DUNE from CINEPOLIS' },
  { PRODUCT_ID: 2, PRODUCT_NAME: 'ALIEN from CINEPOLIS' },
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

describe('GET /management/discounts', () => {
  test('200 OK', async () => {
    const connection = useConnection([{ rows: MOCK_DISCOUNTS }]);

    const response = await request(app)
      .get('/management/discounts')
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(MOCK_DISCOUNTS);
    expect(response.body.data).toHaveLength(2);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('500 when the query fails', async () => {
    const connection = useConnection([
      new Error('ORA-00942: table or view does not exist'),
    ]);

    const response = await request(app).get('/management/discounts').expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

describe('GET /management/discounts/DP/:type', () => {
  const getProducts = (type) =>
    request(app).get(`/management/discounts/DP/${encodeURIComponent(type)}`);

  test.each([
    ['SNACK', MOCK_SNACKS, /PI_DEVELOPERS\.SNACKS/],
    ['PELICULA EN CARTELERA', MOCK_MOVIES, /PI_DEVELOPERS\.MOVIES_IN_BILLBOARD/],
  ])('type %s 200 OK', async (type, rows, tablePattern) => {
    const connection = useConnection([{ rows }]);

    const response = await getProducts(type)
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(rows);
    expect(response.body.data).toHaveLength(2);

    const [sql] = connection.execute.mock.calls[0];
    expect(sql).toMatch(tablePattern);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test.each([['SNACK'], ['PELICULA EN CARTELERA']])(
    'type %s 500 when the query fails',
    async (type) => {
      const connection = useConnection([
        new Error('ORA-00942: table or view does not exist'),
      ]);

      const response = await getProducts(type).expect(500);

      expect(response.body.message).toMatch(/ORA-00942/);
      expect(connection.close).toHaveBeenCalledTimes(1);
    }
  );

  test('400 when the type is not valid', async () => {
    const connection = useConnection([]);

    const response = await getProducts('INVALIDO').expect(400);

    expect(response.body).toHaveProperty('message');
    expect(connection.execute).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

describe('POST /management/discounts/:type', () => {
  const post = (type) =>
    request(app)
      .post(`/management/discounts/${encodeURIComponent(type)}`)
      .send(NEW_DISCOUNT);

  test.each([
    ['SNACK', 'ID_SNACKS', 'ID_MOVIE_IN_BILLBOARD'],
    ['PELICULA EN CARTELERA', 'ID_MOVIE_IN_BILLBOARD', 'ID_SNACKS'],
  ])('type %s 200 OK and inserts into %s', async (type, column, otherColumn) => {
    const connection = useConnection([
      { rows: [{ LAST_ID: 121 }] },
      { rowsAffected: 1 },
    ]);

    const response = await post(type)
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(connection.execute).toHaveBeenCalledTimes(2);

    const [sql, binds, options] = connection.execute.mock.calls[1];
    expect(sql).toMatch(/INSERT INTO PI_DEVELOPERS\.DISCOUNTS/);
    expect(sql).toContain(column);
    expect(sql).not.toContain(otherColumn);
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

  test('starts at id 1 when the table is empty', async () => {
    const connection = useConnection([
      { rows: [{ LAST_ID: null }] },
      { rowsAffected: 1 },
    ]);

    await post('SNACK').expect(200);

    const [, binds] = connection.execute.mock.calls[1];
    expect(binds.ID).toBe(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('500 when the insert fails', async () => {
    const connection = useConnection([
      { rows: [{ LAST_ID: 121 }] },
      new Error('ORA-00001: unique constraint violated'),
    ]);

    const response = await post('SNACK').expect(500);

    expect(response.body.message).toMatch(/ORA-00001/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('400 when the type is not valid and nothing is inserted', async () => {
    const connection = useConnection([{ rows: [{ LAST_ID: 121 }] }]);

    const response = await post('INVALIDO').expect(400);

    expect(response.body).toHaveProperty('message');

    const executedSql = connection.execute.mock.calls.map(([sql]) => sql);
    expect(executedSql.some((sql) => /INSERT/i.test(sql))).toBe(false);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});