import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import {
  countMoviesInBillboards,
  listMoviesInBillboards,
  findMovieInBillboardById
} from '../repositories/movie_in_billboard_repository.js';

const MOVIE_IN_BILLBOARD_NOT_FOUND_MESSAGE = 'No se encontró la película en cartelera.';

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
