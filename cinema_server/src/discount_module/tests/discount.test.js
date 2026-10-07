import {expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import discountRoutes from '../routes/discount_routes.js';

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

  test('Discounts list 200 OK', async () => {
    const mockDiscounts = [
      { ID_DISCOUNTS: 1,DISCOUNT_NAME: 'BIRTHDAY' ,DISCOUNT_PORCENTAGE: 30, },
      { ID_DISCOUNTS: 2,DISCOUNT_NAME: 'D.DAY' ,DISCOUNT_PORCENTAGE: 50},
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({
        rows: mockDiscounts
      }),
      close: jest.fn().mockResolvedValue()
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .get('/management/discounts')
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toEqual(mockDiscounts);
    expect(response.body.data).toHaveLength(2);
    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });
   test('Discount list 500 when the query fails', async () => {
    const mockConnection = {
      execute: jest.fn().mockRejectedValue(new Error('ORA-00942: table or view does not exist')),
      close: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .get('/management/discounts')
      .expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });
});

describe('GET /management/discounts/DP', () => {
  test('Discount products 200 OK', async () => {
    const mockProducts = [
      { ID_SNACK: 1, SNACK_NAME: 'PALOMITAS' },
      { ID_SNACK: 2, SNACK_NAME: 'REFRESCO' },
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: mockProducts }),
      close: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .get('/management/discounts/DP')
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toEqual(mockProducts);
    expect(response.body.data).toHaveLength(2);
    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });

  test('Discount products 500 when the query fails', async () => {
    const mockConnection = {
      execute: jest.fn().mockRejectedValue(new Error('ORA-00942: table or view does not exist')),
      close: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .get('/management/discounts/DP')
      .expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });
});

describe('POST /management/discounts', () => {
  const newDiscount = {
    DISCOUNT_NAME: 'NAVIDAD',
    DISCOUNT_PORCENTAGE: '15',
    DISCOUNT_START_DATE: '2026-12-01',
    DISCOUNT_FINISH_DATE: '2026-12-31',
    ID_FK_PRODUCT: 1,
  };

  test('Create discount 200 OK with the next id', async () => {
    const mockConnection = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ LAST_ID: 121 }] })
        .mockResolvedValueOnce({ rowsAffected: 1 }),
      close: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .post('/management/discounts')
      .send(newDiscount)
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(mockConnection.execute).toHaveBeenCalledTimes(2);

    const [sql, binds, options] = mockConnection.execute.mock.calls[1];
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

    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });

  test('Create discount starts at id 1 when the table is empty', async () => {
    const mockConnection = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ LAST_ID: null }] })
        .mockResolvedValueOnce({ rowsAffected: 1 }),
      close: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    await request(app)
      .post('/management/discounts')
      .send(newDiscount)
      .expect(200);

    const [, binds] = mockConnection.execute.mock.calls[1];
    expect(binds.ID).toBe(1);
    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });

  test('Create discount 500 when the insert fails', async () => {
    const mockConnection = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ rows: [{ LAST_ID: 121 }] })
        .mockRejectedValueOnce(new Error('ORA-00001: unique constraint violated')),
      close: jest.fn().mockResolvedValue(),
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .post('/management/discounts')
      .send(newDiscount)
      .expect(500);

    expect(response.body.message).toMatch(/ORA-00001/);
    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });
});
