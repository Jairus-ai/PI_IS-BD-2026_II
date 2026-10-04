import oracledb from "oracledb";

export const getLanguageList = async (req, res, next) => {
  let connection;

  try {
    connection = await oracledb.getConnection();

    const sql = `
      SELECT iso_code, language_name
      FROM PI_DEVELOPERS.languages
      ORDER BY language_name ASC
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
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error closing connection to the database: ", error);
      }
    }
  }
};