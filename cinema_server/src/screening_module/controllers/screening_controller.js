import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';

const SCREENINGS_BY_MOVIE_QUERY = `
  SELECT
    sc.ID_SCREENING,
    l.ID_LOCATION,
    l.LOCATION_NAME,
    s.ID_SCREEN,
    s.SCREEN_TYPE,
    sc.MOVIE_LANGUAGE,
    sc.MOVIE_FORMAT,
    TO_CHAR(TRUNC(sc.SCREENING_DATE) + sc.SCREENING_START_TIME, 'YYYY-MM-DD"T"HH24:MI:SS') AS START_TIME
  FROM PI_DEVELOPERS.SCREENINGS sc
    JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = sc.ID_MOVIE_IN_BILLBOARD
    JOIN PI_DEVELOPERS.SCREENS s ON s.ID_SCREEN = sc.ID_SCREEN
    JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = mib.ID_LOCATION
  WHERE mib.ID_MOVIE = :idMovie
    AND sc.IS_DELETED = 0
    AND mib.IS_DELETED = 0
    AND s.IS_DELETED = 0
    AND l.IS_DELETED = 0
    AND s.ID_LOCATION = mib.ID_LOCATION
    AND TRUNC(sc.SCREENING_DATE) + sc.SCREENING_START_TIME > SYSDATE
    AND (:idLocation IS NULL OR mib.ID_LOCATION = :idLocation)
  ORDER BY TRUNC(sc.SCREENING_DATE) + sc.SCREENING_START_TIME, l.LOCATION_NAME, s.ID_SCREEN
`;

const parsePositiveInt = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export const getScreeningsByMovie = async (req, res, next) => {
  const idMovie = parsePositiveInt(req.params.idMovie);
  const hasLocationFilter = req.query.idLocation !== undefined;
  const idLocation = hasLocationFilter ? parsePositiveInt(req.query.idLocation) : null;

  if (idMovie === null || (hasLocationFilter && idLocation === null)) {
    return next({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'El identificador de la película o de la sucursal no es válido.',
    });
  }

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      SCREENINGS_BY_MOVIE_QUERY,
      {
        idMovie,
        idLocation: { val: idLocation, type: oracledb.NUMBER },
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ data: result.rows });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};