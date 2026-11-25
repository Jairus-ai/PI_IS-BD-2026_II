import oracledb from 'oracledb';

export async function locationExists(connection, id) {
  const sql = `
    SELECT 1
    FROM PI_DEVELOPERS.LOCATIONS
    WHERE ID_LOCATION = :id
      AND IS_DELETED = 0
  `;

  const result = await connection.execute(
    sql,
    { id: Number(id) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows.length > 0;
}
