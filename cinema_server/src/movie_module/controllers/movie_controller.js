import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import {
  rollback,
  countMovies,
  listMovies,
  findMovieById,
  splitMovieBody,
  createMovieWithRelations,
  updateMovieWithRelations,
  softDeleteMovie
} from '../repositories/movieRepository.js';

export const getMoviesCount = async (req, res, next) => {
  console.log("getMoviesCount is being called");

  let connection;

  try {
    connection = await getConnection();
    const total = await countMovies(connection, req.validatedQuery ?? req.query);

    res.status(200).json({
      total
    });

  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getMoviesList = async (req, res, next) => {
  console.log("getMoviesList is being called");

  let connection;

  try {
    const page = req.validatedQuery?.page ?? 1;

    connection = await getConnection();
    const { limit, rows } = await listMovies(connection, req.validatedQuery ?? req.query, page);

    res.status(200).json({
      page,
      limit,
      data: rows
    });

  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getMovieByID = async (req, res, next) => {
  console.log("getMovieByID is being called");

  let connection;

  try {
    const { id } = req.validatedParams ?? req.params;

    connection = await getConnection();
    const row = await findMovieById(connection, id);

    if (!row) {
      return res.status(404).json({
        message: 'Movie not found'
      });
    }

    res.status(200).json({
      data: row
    });

  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const createMovie = async (req, res, next) => {
  console.log("createMovie is being called");

  let connection;

  try {
    const { movie, relations } = splitMovieBody(req.validatedBody ?? req.body);

    connection = await getConnection();
    const idMovie = await createMovieWithRelations(connection, movie, relations);

    res.status(201).json({ data: { ID_MOVIE: idMovie, ...movie, ...relations } });

  } catch (error) {
    await rollback(connection);
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const updateMovie = async (req, res, next) => {
  const { id } = req.validatedParams ?? req.params;

  const { movie, relations } = splitMovieBody(req.validatedBody ?? req.body);
  if (Object.keys(movie).length === 0 && Object.keys(relations).length === 0) {
    return next({ status: 400, code: 'EMPTY_BODY', message: 'Nada que actualizar.' });
  }

  console.log("updateMovie is being called");

  let connection;

  try {
    connection = await getConnection();
    const outcome = await updateMovieWithRelations(connection, id, movie, relations);

    if (outcome === 'empty') {
      return next({ status: 400, code: 'EMPTY_BODY', message: 'Nada que actualizar.' });
    }

    if (outcome === 'not-found') {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.status(200).json({ data: { ID_MOVIE: Number(id), ...movie, ...relations } });

  } catch (error) {
    await rollback(connection);
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const deleteMovie = async (req, res, next) => {
  const { id } = req.validatedParams ?? req.params;

  console.log("deleteMovie is being called");

  let connection;

  try {
    connection = await getConnection();
    const rowsAffected = await softDeleteMovie(connection, id);

    if (rowsAffected === 0) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    res.status(200).json({ data: { ID_MOVIE: Number(id) } });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};
