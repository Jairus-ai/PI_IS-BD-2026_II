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

const NOW_SHOWING = [
  { ID_MOVIE: 1, MOVIE_TITLE: 'Inception', POSTER: '/posters/inception.jpg', MOVIE_DURATION: 148, RATING_CODE: 'PG-13', GENRES: 'Acción, Ciencia ficción' },
  { ID_MOVIE: 2, MOVIE_TITLE: 'El último faro', POSTER: null, MOVIE_DURATION: 95, RATING_CODE: 'TP', GENRES: null }
];

describe('GET /billboard/now-showing', () => {
  test('Returns the movies with upcoming screenings without a session', async () => {
    const connection = mockDatabase({ rows: NOW_SHOWING });

    const response = await request(app)
      .get('/billboard/now-showing')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(NOW_SHOWING);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('Only takes active movies with screenings that have not started, in Costa Rica time', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app).get('/billboard/now-showing').expect(200);

    const [sql] = connection.execute.mock.calls[0];
    expect(sql).toMatch(/m\.IS_DELETED = 0/);
    expect(sql).toMatch(/EXISTS/);
    for (const condition of ['sc.IS_DELETED = 0', 'mib.IS_DELETED = 0', 's.IS_DELETED = 0', 'l.IS_DELETED = 0']) {
      expect(sql).toContain(condition);
    }
    expect(sql).toContain('sc.SCREENING_START_TIME > CURRENT_DATE');
    expect(sql).not.toContain('SYSDATE');
  });

  test('Returns each movie once with its rating, duration and genres', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app).get('/billboard/now-showing').expect(200);

    const [sql] = connection.execute.mock.calls[0];
    expect(sql).toMatch(/FROM PI_DEVELOPERS\.MOVIES m/);
    expect(sql).toContain('r.RATING_CODE');
    expect(sql).toContain('m.MOVIE_DURATION');
    expect(sql).toMatch(/LISTAGG\(g\.GENRE_NAME/);
  });

  test('Returns an empty list when no movie has upcoming screenings', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app).get('/billboard/now-showing').expect(200);

    expect(response.body.data).toEqual([]);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    await request(app).get('/billboard/now-showing').expect(500);

    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});
