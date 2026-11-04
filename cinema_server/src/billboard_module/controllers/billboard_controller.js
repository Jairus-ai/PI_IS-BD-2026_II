import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';

//A movie is in the billboard when today's date is between its opening and closing date in any location.
//Premieres first, then most recent openings.
const BILLBOARD_MOVIES_QUERY = `
  SELECT
    m.ID_MOVIE,
    m.MOVIE_TITLE,
    m.POSTER
  FROM PI_DEVELOPERS.MOVIES m
    JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE = m.ID_MOVIE
  WHERE m.IS_DELETED = 0
    AND mib.IS_DELETED = 0
    AND TRUNC(SYSDATE) BETWEEN mib.OPENING_DATE AND mib.CLOSING_DATE
  GROUP BY m.ID_MOVIE, m.MOVIE_TITLE, m.POSTER
  ORDER BY MAX(mib.PREMIER) DESC, MAX(mib.OPENING_DATE) DESC, m.MOVIE_TITLE ASC
`;

export const getBillboardMovies = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(BILLBOARD_MOVIES_QUERY, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    res.status(200).json({ data: result.rows });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
