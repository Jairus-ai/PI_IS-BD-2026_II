import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { movieExists } from '../../movie_module/repositories/movie_repository.js';
import { locationExists } from '../../location_module/repositories/location_repository.js';
import {
  countMoviesInBillboards,
  listMoviesInBillboards,
  findMovieInBillboardById,
  hasOverlappingMovieInBillboard,
  insertMovieInBillboard
} from '../repositories/movie_in_billboard_repository.js';

const MOVIE_IN_BILLBOARD_NOT_FOUND_MESSAGE = 'No se encontró la película en cartelera.';
const MOVIE_NOT_FOUND_MESSAGE = 'La película seleccionada no existe.';
const LOCATION_NOT_FOUND_MESSAGE = 'La sucursal seleccionada no existe.';
const OVERLAPPING_MOVIE_IN_BILLBOARD_MESSAGE = 'La película ya está en la cartelera de esta sucursal durante esas fechas.';

export const getMoviesInBillboardsCount = async (req, res, next) => {
  let connection;

  try {
    connection = await getConnection();
    const total = await countMoviesInBillboards(connection, req.validatedQuery);

    res.status(200).json({
      total
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getMoviesInBillboardsList = async (req, res, next) => {
  let connection;

  try {
    const { page } = req.validatedQuery;

    connection = await getConnection();
    const { limit, rows } = await listMoviesInBillboards(connection, req.validatedQuery, page);

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

export const getMovieInBillboardByID = async (req, res, next) => {
  let connection;

  try {
    const { id } = req.validatedParams;

    connection = await getConnection();
    const row = await findMovieInBillboardById(connection, id);

    if (!row)
      return res.status(404).json({ message: MOVIE_IN_BILLBOARD_NOT_FOUND_MESSAGE });

    res.status(200).json({
      data: row
    });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const createMovieInBillboard = async (req, res, next) => {
  let connection;

  try {
    const movieInBillboard = req.validatedBody;

    connection = await getConnection();

    if (!await movieExists(connection, movieInBillboard.movieId))
      return res.status(400).json({ message: MOVIE_NOT_FOUND_MESSAGE });

    if (!await locationExists(connection, movieInBillboard.locationId))
      return res.status(400).json({ message: LOCATION_NOT_FOUND_MESSAGE });

    if (await hasOverlappingMovieInBillboard(connection, movieInBillboard))
      return res.status(409).json({ message: OVERLAPPING_MOVIE_IN_BILLBOARD_MESSAGE });

    const id = await insertMovieInBillboard(connection, movieInBillboard);
    const row = await findMovieInBillboardById(connection, id);

    res.status(201).json({
      data: row
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};
