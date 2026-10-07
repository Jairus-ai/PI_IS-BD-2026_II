import {expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import discountRoutes from '../routes/discount_routes.js';

const app = express();
app.use(express.json());
app.use('/management/discounts', discountRoutes);

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
});


