import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

export const getRatingList = async (req, res, next) => {
  let connection;

  try {
    connection = await getConnection();

    const sql = `
      SELECT id_rating, rating_name, rating_code
      FROM PI_DEVELOPERS.ratings
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
