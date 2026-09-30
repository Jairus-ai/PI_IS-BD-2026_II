export const getRatingList = async (req, res, next) => {
  let connection;

  try {
    connection = await oracledb.getConnection();

    const sql = `
      SELECT id_rating, rating_name, rating_code
      FROM ratings
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