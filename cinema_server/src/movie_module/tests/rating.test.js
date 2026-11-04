import { describe, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

const { default: ratingRoutes } = await import('../routes/rating_routes.js');

const app = express();
app.use(express.json());
app.use('/management/ratings', ratingRoutes);

describe('GET /management/ratings', () => {
  test('Rating list 200 OK', async () => {
    const mockRatings = [
      { id_rating: 1, rating_name: 'Todo público', rating_code: 'G' },
      { id_rating: 2, rating_name: 'Mayores de 13 años', rating_code: 'PG-13' },
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: mockRatings }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/ratings')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ data: mockRatings });
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(mockConnection);
  });

  test('Rating list 500 Internal Server Error', async () => {
    mockGetConnection.mockRejectedValue(new Error('Oracle error'));
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/ratings')
      .expect(500);

    expect(mockCloseDatabaseConnection).toHaveBeenCalled();
  });
});