import { describe, expect, jest, test } from '@jest/globals';

import {
  buildMovieFilters,
  countMovies,
  createMovieWithRelations,
  findMovieById,
  listMovies,
  listMovieOptions,
  movieTitleExists,
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
  const execute = jest.fn().mockResolvedValue({
    rowsAffected: 1,
    rows: []
  });

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

  test('Only replaces the languages that changed', async () => {
    const connection = createConnection(
      { rows: [{ 1: 1 }] },
      {
        rows: [
          {
            ID_MOVIE_LANGUAGE: 5,
            LANGUAGE_TYPE: 'OG',
            ISO_CODE: 'en'
          },
          {
            ID_MOVIE_LANGUAGE: 6,
            LANGUAGE_TYPE: 'SUB',
            ISO_CODE: 'es'
          }
        ]
      }
    );

    const languages = [
      {
        LANGUAGE_TYPE: 'OG',
        ISO_CODE: 'en'
      },
      {
        LANGUAGE_TYPE: 'DUB',
        ISO_CODE: 'fr'
      }
    ];

    await updateMovieWithRelations(connection, 1, {}, { LANGUAGES: languages });

    const binds = connection.execute.mock.calls.map((call) => call[1]);

    expect(binds.slice(2)).toEqual([
      { idmovielanguage: 6 },
      {
        languagetype: 'DUB',
        idmovie: 1,
        isocode: 'fr'
      }
    ]);
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

  test('Lists the movie options', async () => {
    const connection = createConnection({ rows: [{ ID_MOVIE: 1 }] });

    expect(await listMovieOptions(connection)).toEqual([{ ID_MOVIE: 1 }]);
  });

  test('Checks if another movie has the same title', async () => {
    const connection = createConnection({ rows: [{ 1: 1 }] }, { rows: [] });

    expect(await movieTitleExists(connection, 'Tenet')).toBe(true);
    expect(await movieTitleExists(connection, 'Tenet', 4)).toBe(false);
  });
});
