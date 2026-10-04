import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

export const getGenreList = async (req, res, next) => {
  let connection;

  try {
    connection = await getConnection();

    const sql = `
      SELECT id_genre, genre_name
      FROM pi_developers.genres
      ORDER BY genre_name ASC
    `;

    const result = await connection.execute(
      sql,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Convert output to JSON
    );

    res.status(200).json({
      data: result.rows
    });

  } catch (error) {
    // TODO(Jesus): manage errors
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};