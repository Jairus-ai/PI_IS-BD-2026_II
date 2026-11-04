import { describe, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

const { default: languageRoutes } = await import('../routes/language_routes.js');

const app = express();
app.use(express.json());
app.use('/management/languages', languageRoutes);

describe('GET /management/languages', () => {
  test('Language list 200 OK', async () => {
    const mockLanguages = [
      { iso_code: 'EN', language_name: 'Inglés' },
      { iso_code: 'ES', language_name: 'Español' },
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: mockLanguages }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/languages')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ data: mockLanguages });
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(mockConnection);
  });

  test('Language list 500 Internal Server Error', async () => {
    mockGetConnection.mockRejectedValue(new Error('Oracle error'));
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/languages')
      .expect(500);

    expect(mockCloseDatabaseConnection).toHaveBeenCalled();
  });
});