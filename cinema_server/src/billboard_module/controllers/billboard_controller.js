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
    AND TRUNC(CURRENT_DATE) BETWEEN mib.OPENING_DATE AND mib.CLOSING_DATE
  GROUP BY m.ID_MOVIE, m.MOVIE_TITLE, m.POSTER
  ORDER BY MAX(mib.PREMIER) DESC, MAX(mib.OPENING_DATE) DESC, m.MOVIE_TITLE ASC
`;

const NOW_SHOWING_QUERY = `
  SELECT
    m.ID_MOVIE,
    m.MOVIE_TITLE,
    m.POSTER,
    m.MOVIE_DURATION,
    r.RATING_CODE,
    (
      SELECT LISTAGG(g.GENRE_NAME, ', ') WITHIN GROUP (ORDER BY g.GENRE_NAME)
      FROM PI_DEVELOPERS.MOVIES_GENRES mg
        JOIN PI_DEVELOPERS.GENRES g ON g.ID_GENRE = mg.ID_GENRE
      WHERE mg.ID_MOVIE = m.ID_MOVIE
    ) AS GENRES
  FROM PI_DEVELOPERS.MOVIES m
    JOIN PI_DEVELOPERS.RATINGS r ON r.ID_RATING = m.ID_RATING
  WHERE m.IS_DELETED = 0
    AND EXISTS (
      SELECT 1
      FROM PI_DEVELOPERS.SCREENINGS sc
        JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = sc.ID_MOVIE_IN_BILLBOARD
        JOIN PI_DEVELOPERS.SCREENS s ON s.ID_SCREEN = sc.ID_SCREEN
        JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = mib.ID_LOCATION
      WHERE mib.ID_MOVIE = m.ID_MOVIE
        AND sc.IS_DELETED = 0
        AND mib.IS_DELETED = 0
        AND s.IS_DELETED = 0
        AND l.IS_DELETED = 0
        AND s.ID_LOCATION = mib.ID_LOCATION
        AND TRUNC(sc.SCREENING_DATE) + sc.SCREENING_START_TIME > CURRENT_DATE
    )
  ORDER BY m.MOVIE_TITLE ASC, m.ID_MOVIE ASC
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

export const getNowShowingMovies = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(NOW_SHOWING_QUERY, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    res.status(200).json({ data: result.rows });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
