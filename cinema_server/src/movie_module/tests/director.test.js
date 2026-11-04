import { describe, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

const { default: directorRoutes } = await import('../routes/director_routes.js');

const app = express();
app.use(express.json());
app.use('/management/directors', directorRoutes);

describe('GET /management/directors', () => {
  test('Director list 200 OK', async () => {
    const mockDirectors = [
      { id_director: 1, director_first_name: 'Christopher', director_last_name: 'Nolan' },
      { id_director: 2, director_first_name: 'Steven', director_last_name: 'Spielberg' },
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: mockDirectors }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/directors')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ data: mockDirectors });
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(mockConnection);
  });

  test('Director list 500 Internal Server Error', async () => {
    mockGetConnection.mockRejectedValue(new Error('Oracle error'));
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/directors')
      .expect(500);

    expect(mockCloseDatabaseConnection).toHaveBeenCalled();
  });
});