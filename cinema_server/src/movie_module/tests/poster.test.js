import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

let mockFile = null;

jest.unstable_mockModule('../../middleware/upload.js', () => ({
  uploadPoster: {
    single: () => (req, res, next) => {
      req.file = mockFile;
      next();
    },
  },
}));

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: jest.fn(),
  closeDatabaseConnection: jest.fn(),
}));

jest.unstable_mockModule('../repositories/movieRepository.js', () => ({
  rollback: jest.fn(),
  countMovies: jest.fn(),
  listMovies: jest.fn(),
  findMovieById: jest.fn(),
  splitMovieBody: jest.fn(),
  createMovieWithRelations: jest.fn(),
  updateMovieWithRelations: jest.fn(),
  softDeleteMovie: jest.fn(),
}));

jest.unstable_mockModule('../../middleware/validate.js', () => ({
  validateQuery: () => (req, res, next) => next(),
  validateParams: () => (req, res, next) => next(),
  validateBody: () => (req, res, next) => next(),
}));

const { default: movieRoutes } = await import('../routes/movie_routes.js');

const app = express();
app.use(express.json());
app.use('/management/movies', movieRoutes);

describe('POST /management/movies/poster', () => {
  beforeEach(() => {
    mockFile = null;
  });

  test('201 Created - Retorna la ruta del póster cuando se sube el archivo', async () => {
    mockFile = { filename: 'abc-123.webp' };

    const response = await request(app)
      .post('/management/movies/poster')
      .expect(201);

    expect(response.body).toEqual({
      data: { poster: '/posters/abc-123.webp' },
    });
  });

  test('400 Bad Request - Error si no se proporciona ningún archivo', async () => {
    mockFile = undefined;

    const response = await request(app)
      .post('/management/movies/poster')
      .expect(400);

    expect(response.body).toEqual({
      message: 'No se encontró el poster.',
    });
  });
});