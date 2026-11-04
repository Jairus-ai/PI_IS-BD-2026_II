import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';

import billboardRoutes from '../routes/billboard_routes.js';

const MOCK_MOVIES = [
  { ID_MOVIE: 1, MOVIE_TITLE: 'Inception', POSTER: '/posters/inception.jpg' },
  { ID_MOVIE: 2, MOVIE_TITLE: 'El último faro', POSTER: null }
];

const app = express();
app.use('/billboard', billboardRoutes);
app.use((error, req, res, next) => {
  res.status(500).json({ message: error.message });
});

function mockDatabase(response) {
  const execute = response instanceof Error
    ? jest.fn().mockRejectedValue(response)
    : jest.fn().mockResolvedValue(response);
  const connection = { execute, close: jest.fn().mockResolvedValue() };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /billboard/movies', () => {
  test('Returns the movies in the billboard without a session', async () => {
    const connection = mockDatabase({ rows: MOCK_MOVIES });

    const response = await request(app)
      .get('/billboard/movies')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(MOCK_MOVIES);
    const [sql] = connection.execute.mock.calls[0];
    expect(sql).toMatch(/BETWEEN mib\.OPENING_DATE AND mib\.CLOSING_DATE/);
    expect(sql).toMatch(/m\.IS_DELETED = 0/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('Returns an empty list when there are no movies in the billboard', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app).get('/billboard/movies').expect(200);

    expect(response.body.data).toEqual([]);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    await request(app).get('/billboard/movies').expect(500);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});
