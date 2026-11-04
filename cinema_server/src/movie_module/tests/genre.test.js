import { describe, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

const { default: genreRoutes } = await import('../routes/genre_routes.js');

const app = express();
app.use(express.json());
app.use('/management/genres', genreRoutes);

describe('GET /management/genres', () => {

  test('Genre list 200 OK', async () => {
    const mockGenres = [
      { id_genre: 1, genre_name: 'Acción' },
      { id_genre: 2, genre_name: 'Comedia' },
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({
        rows: mockGenres
      }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/genres')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ data: mockGenres });
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(mockConnection);
  });

  test('Genre list 500 Internal Server Error', async () => {
    mockGetConnection.mockRejectedValue(new Error('Oracle error'));
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/genres')
      .expect(500);

    expect(mockCloseDatabaseConnection).toHaveBeenCalled();
  });
});