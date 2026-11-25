import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import screeningRoutes from '../routes/screening_routes.js';
import { globalErrorHandler } from '../../middleware/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/screenings', screeningRoutes);
app.use(globalErrorHandler);

function mockDatabaseConnection(executeImplementation) {
  const connection = {
    execute: jest.fn(executeImplementation),
    close: jest.fn().mockResolvedValue()
  };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const SCREENING_ROW = {
  ID_SCREENING: 10,
  ID_LOCATION: 2,
  LOCATION_NAME: 'Cine Central',
  ID_SCREEN: 3,
  SCREEN_TYPE: 'IMAX',
  MOVIE_LANGUAGE: 'Español',
  MOVIE_FORMAT: 'IMAX 2D',
  START_TIME: '2026-11-20T19:30:00'
};

describe('GET /screenings/movie/:idMovie', () => {
  test('returns the screenings of every location when no filter is sent', async () => {
    const connection = mockDatabaseConnection(async () => ({ rows: [SCREENING_ROW] }));

    const response = await request(app).get('/screenings/movie/5');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [SCREENING_ROW] });
    expect(connection.execute).toHaveBeenCalledTimes(1);

    const [, binds, options] = connection.execute.mock.calls[0];
    expect(binds).toEqual({
      idMovie: 5,
      idLocation: { val: null, type: oracledb.NUMBER }
    });
    expect(options).toEqual(
      expect.objectContaining({ outFormat: oracledb.OUT_FORMAT_OBJECT })
    );
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('sends the location filter as a bind variable', async () => {
    const connection = mockDatabaseConnection(async () => ({ rows: [SCREENING_ROW] }));

    const response = await request(app).get('/screenings/movie/5?idLocation=2');

    expect(response.status).toBe(200);
    const [, binds] = connection.execute.mock.calls[0];
    expect(binds).toEqual({
      idMovie: 5,
      idLocation: { val: 2, type: oracledb.NUMBER }
    });
  });

  test('queries only active screenings that have not started yet', async () => {
    const connection = mockDatabaseConnection(async () => ({ rows: [] }));

    await request(app).get('/screenings/movie/5');

    const [sql] = connection.execute.mock.calls[0];
    expect(sql).toContain('sc.IS_DELETED = 0');
    expect(sql).toContain('mib.IS_DELETED = 0');
    expect(sql).toContain('s.IS_DELETED = 0');
    expect(sql).toContain('l.IS_DELETED = 0');
    expect(sql).toContain('> CURRENT_DATE');
    expect(sql).not.toContain('SYSDATE');
  });

  test('returns an empty list when the movie has no available screenings', async () => {
    const connection = mockDatabaseConnection(async () => ({ rows: [] }));

    const response = await request(app).get('/screenings/movie/999');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test.each(['abc', '0', '-1', '1.5'])(
    'returns 400 without touching the database when idMovie is "%s"',
    async (idMovie) => {
      const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

      const response = await request(app).get(`/screenings/movie/${idMovie}`);

      expect(response.status).toBe(400);
      expect(getConnectionSpy).not.toHaveBeenCalled();
    }
  );

  test.each(['x', '0', '-2', ''])(
    'returns 400 without touching the database when idLocation is "%s"',
    async (idLocation) => {
      const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

      const response = await request(app).get(`/screenings/movie/5?idLocation=${idLocation}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(getConnectionSpy).not.toHaveBeenCalled();
    }
  );

  test('returns 500 and releases the connection when the query fails', async () => {
    const connection = mockDatabaseConnection(async () => {
      throw new Error('ORA-00942: table or view does not exist');
    });

    const response = await request(app).get('/screenings/movie/5');

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('DATABASE_ERROR');
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});