import oracledb from 'oracledb';

import {
  getConnection,
  closeDatabaseConnection,
} from '../../database/database.js';

export const getLocationsList = async (req, res, next) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
        SELECT
          ID_LOCATION,
          LOCATION_NAME
        FROM PI_DEVELOPERS.LOCATIONS
        WHERE IS_DELETED = 0
        ORDER BY LOCATION_NAME
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};