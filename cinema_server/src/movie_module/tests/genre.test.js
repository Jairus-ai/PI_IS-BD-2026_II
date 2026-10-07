import { beforeAll, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb, { errorOnConcurrentExecute } from 'oracledb';
import genreRoutes from '../routes/genre_routes.js';

const app = express();
app.use(express.json());
app.use('/management/genres', genreRoutes);

describe('GET /management/genres', () => {

  test('Genre list 200 OK', async () => {
    const mockGenres = [
      { id_genre: 1, genre_name: 'Acción'},
      { id_genre: 2, genre_name: 'Comedia'},
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({
        rows: mockGenres
      }),
      close: jest.fn().mockResolvedValue()
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .get('/management/genres')
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toEqual(mockGenres);
    expect(response.body.data).toHaveLength(2);
    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  });

  test('Genre list 500 Internal Server Error', async () => {
    const mockConnection = {
      execute: jest.fn().mockRejectedValue(new Error('Oracle error')),
      close: jest.fn().mockResolvedValue()
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(mockConnection);

    const response = await request(app)
      .get('/management/genres')
      .expect(500);

    expect(mockConnection.close).toHaveBeenCalledTimes(1);
  })
});
