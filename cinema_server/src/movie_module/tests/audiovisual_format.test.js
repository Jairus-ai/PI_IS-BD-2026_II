import { describe, test, expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

const { default: audiovisualFormatRoutes } = await import('../routes/audiovisual_format_routes.js');

const app = express();
app.use(express.json());
app.use('/management/audiovisual_format', audiovisualFormatRoutes);

describe('GET /management/audiovisual_format', () => {
  test('Audiovisual format list 200 OK', async () => {
    const mockFormats = [
      {
        id_audiovisual_format: 1,
        video_format_name: '4K',
        id_video_format: 1,
        audio_format_name: 'Dolby Atmos',
        id_audio_format: 1,
      },
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: mockFormats }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/audiovisual_format')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ data: mockFormats });
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(mockConnection);
  });

  test('Audiovisual format list 500 Internal Server Error', async () => {
    mockGetConnection.mockRejectedValue(new Error('Oracle error'));
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/audiovisual_format')
      .expect(500);

    expect(mockCloseDatabaseConnection).toHaveBeenCalled();
  });
});