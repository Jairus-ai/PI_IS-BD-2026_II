import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

export const getDirectorList = async (req, res, next) => {
  let connection;

  try {
    connection = await getConnection();

    const sql = `
      SELECT id_director, director_first_name, director_last_name
      FROM pi_developers.directors
      ORDER BY director_last_name ASC, director_first_name ASC
    `;

    const result = await connection.execute(
      sql,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({
      data: result.rows
    });

  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
