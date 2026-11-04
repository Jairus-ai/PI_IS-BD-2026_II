import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

const mockRollback = jest.fn();
const mockCountMovies = jest.fn();
const mockListMovies = jest.fn();
const mockFindMovieById = jest.fn();
const mockSplitMovieBody = jest.fn();
const mockCreateMovieWithRelations = jest.fn();
const mockUpdateMovieWithRelations = jest.fn();
const mockSoftDeleteMovie = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

jest.unstable_mockModule('../repositories/movieRepository.js', () => ({
  rollback: mockRollback,
  countMovies: mockCountMovies,
  listMovies: mockListMovies,
  findMovieById: mockFindMovieById,
  splitMovieBody: mockSplitMovieBody,
  createMovieWithRelations: mockCreateMovieWithRelations,
  updateMovieWithRelations: mockUpdateMovieWithRelations,
  softDeleteMovie: mockSoftDeleteMovie,
}));

jest.unstable_mockModule('../../middleware/validate.js', () => ({
  validateQuery: () => (req, res, next) => next(),
  validateParams: () => (req, res, next) => next(),
  validateBody: () => (req, res, next) => next(),
}));

jest.unstable_mockModule('../../middleware/upload.js', () => ({
  uploadPoster: {
    single: () => (req, res, next) => next(),
  },
}));

const { default: movieRoutes } = await import('../routes/movie_routes.js');

const app = express();
app.use(express.json());
app.use('/management/movies', movieRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Error interno' });
});

describe('Movie Controller Endpoint Tests', () => {
  const dummyConnection = { id: 'dummy-conn' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConnection.mockResolvedValue(dummyConnection);
    mockCloseDatabaseConnection.mockResolvedValue();
    mockRollback.mockResolvedValue();
  });

  describe('GET /management/movies/count', () => {
    test('200 OK - Obtiene el conteo total', async () => {
      mockCountMovies.mockResolvedValue(15);

      const response = await request(app)
        .get('/management/movies/count')
        .expect(200);

      expect(response.body).toEqual({ total: 15 });
      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });

    test('500 Error - Manejo de excepción', async () => {
      mockCountMovies.mockRejectedValue(new Error('DB Error'));

      await request(app)
        .get('/management/movies/count')
        .expect(500);

      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });
  });

  describe('GET /management/movies', () => {
    test('200 OK - Obtiene la lista paginada', async () => {
      const mockRows = [{ ID_MOVIE: 1, MOVIE_TITLE: 'Interstellar' }];
      mockListMovies.mockResolvedValue({ limit: 10, rows: mockRows });

      const response = await request(app)
        .get('/management/movies?page=1')
        .expect(200);

      expect(response.body).toEqual({ page: 1, limit: 10, data: mockRows });
      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });

    test('500 Error - Manejo de excepción', async () => {
      mockListMovies.mockRejectedValue(new Error('DB Error'));

      await request(app)
        .get('/management/movies')
        .expect(500);

      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });
  });

  describe('GET /management/movies/:id', () => {
    test('200 OK - Obtiene película por ID', async () => {
      const mockMovie = { ID_MOVIE: 1, MOVIE_TITLE: 'Inception' };
      mockFindMovieById.mockResolvedValue(mockMovie);

      const response = await request(app)
        .get('/management/movies/1')
        .expect(200);

      expect(response.body).toEqual({ data: mockMovie });
      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });

    test('404 Not Found - Película no encontrada', async () => {
      mockFindMovieById.mockResolvedValue(null);

      const response = await request(app)
        .get('/management/movies/999')
        .expect(404);

      expect(response.body).toEqual({ message: 'Movie not found' });
      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });
  });

  describe('POST /management/movies', () => {
    test('201 Created - Crea película exitosamente', async () => {
      const movieData = { MOVIE_TITLE: 'Tenet', PUBLISHING_YEAR: 2020 };
      const relationsData = { GENRE_IDS: [1] };

      mockSplitMovieBody.mockReturnValue({ movie: movieData, relations: relationsData });
      mockCreateMovieWithRelations.mockResolvedValue(10);

      const response = await request(app)
        .post('/management/movies')
        .send({ ...movieData, ...relationsData })
        .expect(201);

      expect(response.body).toEqual({
        data: { ID_MOVIE: 10, ...movieData, ...relationsData },
      });
      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });

    test('500 Error - Hace rollback si falla la inserción', async () => {
      mockSplitMovieBody.mockReturnValue({ movie: { MOVIE_TITLE: 'Fail' }, relations: {} });
      mockCreateMovieWithRelations.mockRejectedValue(new Error('Insert Error'));

      await request(app)
        .post('/management/movies')
        .send({ MOVIE_TITLE: 'Fail' })
        .expect(500);

      expect(mockRollback).toHaveBeenCalledWith(dummyConnection);
      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });
  });

  describe('PUT /management/movies/:id', () => {
    test('200 OK - Actualiza película exitosamente', async () => {
      const movieData = { MOVIE_TITLE: 'Inception Remastered' };
      mockSplitMovieBody.mockReturnValue({ movie: movieData, relations: {} });
      mockUpdateMovieWithRelations.mockResolvedValue('success');

      const response = await request(app)
        .put('/management/movies/1')
        .send(movieData)
        .expect(200);

      expect(response.body).toEqual({
        data: { ID_MOVIE: 1, ...movieData },
      });
    });

    test('400 Bad Request - Cuerpo vacío', async () => {
      mockSplitMovieBody.mockReturnValue({ movie: {}, relations: {} });

      await request(app)
        .put('/management/movies/1')
        .send({})
        .expect(400);
    });

    test('404 Not Found - Película no existe al actualizar', async () => {
      mockSplitMovieBody.mockReturnValue({ movie: { MOVIE_TITLE: 'Unknown' }, relations: {} });
      mockUpdateMovieWithRelations.mockResolvedValue('not-found');

      await request(app)
        .put('/management/movies/999')
        .send({ MOVIE_TITLE: 'Unknown' })
        .expect(404);

      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });
  });

  describe('DELETE /management/movies/:id', () => {
    test('200 OK - Elimina lógicamente la película', async () => {
      mockSoftDeleteMovie.mockResolvedValue(1);

      const response = await request(app)
        .delete('/management/movies/1')
        .expect(200);

      expect(response.body).toEqual({ data: { ID_MOVIE: 1 } });
      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });

    test('404 Not Found - Película no encontrada al eliminar', async () => {
      mockSoftDeleteMovie.mockResolvedValue(0);

      await request(app)
        .delete('/management/movies/999')
        .expect(404);

      expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(dummyConnection);
    });
  });
});