import { describe, expect, jest, test } from '@jest/globals';

import {
  buildMovieFilters,
  countMovies,
  createMovieWithRelations,
  findMovieById,
  listMovies,
  softDeleteMovie,
  updateMovieWithRelations
} from '../repositories/movie_repository.js';

const RELATIONS = {
  GENRE_IDS: [1],
  DIRECTOR_IDS: [2],
  FORMAT_IDS: [3],
  LANGUAGES: [
    {
      ISO_CODE: 'en',
      LANGUAGE_TYPE: 'OG'
    }
  ]
};

function createConnection(...responses) {
  const execute = jest.fn().mockResolvedValue({ rowsAffected: 1 });

  for (const response of responses)
    execute.mockResolvedValueOnce(response);

  return {
    execute,
    commit: jest.fn(),
    rollback: jest.fn()
  };
}

describe('movie_repository', () => {
  test('Builds the binds of every filter', () => {
    const { binds } = buildMovieFilters({
      movieName: 'Incep',
      genreId: '1',
      languageCode: 'es',
      directorId: '2',
      audiovisualFormatId: '3',
      ratingId: '4'
    });

    expect(binds).toEqual({
      movieName: '%Incep%',
      genreId: 1,
      languageCode: 'es',
      directorId: 2,
      audiovisualFormatId: 3,
      ratingId: 4
    });
  });

  test('Counts the movies', async () => {
    const connection = createConnection({ rows: [{ TOTAL: 7 }] });

    expect(await countMovies(connection, {})).toBe(7);
  });

  test('Lists the movies of a page', async () => {
    const connection = createConnection({ rows: [] });

    const result = await listMovies(connection, {}, 3);

    expect(result.limit).toBe(10);
    expect(connection.execute.mock.calls[0][1]).toEqual({
      offset: 20,
      limit: 10
    });
  });

  test('Returns null when the movie does not exist', async () => {
    const connection = createConnection({ rows: [] });

    expect(await findMovieById(connection, 1)).toBeNull();
  });

  test('Creates the movie with its relations', async () => {
    const connection = createConnection({ outBinds: { idmovie: [12] } });

    expect(await createMovieWithRelations(connection, {}, RELATIONS)).toBe(12);
    expect(connection.commit).toHaveBeenCalled();
  });

  test('Updates the movie with its relations', async () => {
    const connection = createConnection();

    const outcome = await updateMovieWithRelations(connection, 1, { MOVIE_TITLE: 'Inception' }, RELATIONS);

    expect(outcome).toBe('ok');
    expect(connection.commit).toHaveBeenCalled();
  });

  test('Rolls back the update when the movie does not exist', async () => {
    const connection = createConnection({ rows: [] });

    const outcome = await updateMovieWithRelations(connection, 1, {}, RELATIONS);

    expect(outcome).toBe('not-found');
    expect(connection.rollback).toHaveBeenCalled();
  });

  test('Deletes the movie', async () => {
    const connection = createConnection();

    expect(await softDeleteMovie(connection, 1)).toBe(1);
  });
});
