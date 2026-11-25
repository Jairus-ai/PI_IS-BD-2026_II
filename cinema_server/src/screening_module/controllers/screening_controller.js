import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import {
  countScreenings,
  listScreenings,
  findScreeningById
} from '../repositories/screening_repository.js';

const SCREENING_NOT_FOUND_MESSAGE = 'No se encontró la proyección.';

export const getScreeningsCount = async (req, res, next) => {
  let connection;

  try {
    connection = await getConnection();
    const total = await countScreenings(connection, req.validatedQuery);

    res.status(200).json({
      total
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getScreeningsList = async (req, res, next) => {
  let connection;

  try {
    const { page } = req.validatedQuery;

    connection = await getConnection();
    const { limit, rows } = await listScreenings(connection, req.validatedQuery, page);

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

export const getScreeningByID = async (req, res, next) => {
  let connection;

  try {
    const { id } = req.validatedParams;

    connection = await getConnection();
    const row = await findScreeningById(connection, id);

    if (!row)
      return res.status(404).json({ message: SCREENING_NOT_FOUND_MESSAGE });

    res.status(200).json({
      data: row
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};
