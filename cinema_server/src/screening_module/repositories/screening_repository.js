import oracledb from 'oracledb';

const PAGE_LIMIT = 10;

const OBJECT_FORMAT = {
  outFormat: oracledb.OUT_FORMAT_OBJECT
};

const SCREENINGS_SOURCE = `
  FROM PI_DEVELOPERS.SCREENINGS s
    JOIN PI_DEVELOPERS.SCREENS sc ON sc.ID_SCREEN = s.ID_SCREEN
    JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = sc.ID_LOCATION
    JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = s.ID_MOVIE_IN_BILLBOARD
    JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
`;

export function buildScreeningFilters({ locationId, audiovisualFormatId, ratingId, movieName } = {}) {
  const conditions = [
    's.IS_DELETED = 0',
    'sc.IS_DELETED = 0',
    'l.IS_DELETED = 0',
    'mib.IS_DELETED = 0',
    'm.IS_DELETED = 0'
  ];
  const binds = {};

  if (locationId) {
    conditions.push('sc.ID_LOCATION = :locationId');
    binds.locationId = locationId;
  }

  if (audiovisualFormatId) {
    conditions.push('s.ID_AUDIOVISUAL_FORMAT = :audiovisualFormatId');
    binds.audiovisualFormatId = audiovisualFormatId;
  }

  if (ratingId) {
    conditions.push('m.ID_RATING = :ratingId');
    binds.ratingId = ratingId;
  }

  if (movieName) {
    conditions.push('LOWER(m.MOVIE_TITLE) LIKE LOWER(:movieName)');
    binds.movieName = `%${movieName}%`;
  }

  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    binds
  };
}

export async function countScreenings(connection, queryParams) {
  const { whereClause, binds } = buildScreeningFilters(queryParams);

  const sql = `
    SELECT COUNT(*) AS TOTAL
    ${SCREENINGS_SOURCE}
    ${whereClause}
  `;

  const result = await connection.execute(sql, binds, OBJECT_FORMAT);

  return result.rows[0].TOTAL;
}

export async function listScreenings(connection, queryParams, page) {
  const offset = (page - 1) * PAGE_LIMIT;
  const { whereClause, binds } = buildScreeningFilters(queryParams);

  const sql = `
    SELECT
      s.ID_SCREENING,
      l.LOCATION_NAME,
      sc.SCREEN_NUMBER,
      m.MOVIE_TITLE,
      sc.ID_LOCATION,
      s.ID_AUDIOVISUAL_FORMAT,
      m.ID_RATING
    ${SCREENINGS_SOURCE}
    ${whereClause}
    ORDER BY s.SCREENING_DATE DESC, s.SCREENING_START_TIME DESC, s.ID_SCREENING DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

  const result = await connection.execute(
    sql,
    {
      ...binds,
      offset,
      limit: PAGE_LIMIT
    },
    OBJECT_FORMAT
  );

  return {
    limit: PAGE_LIMIT,
    rows: result.rows
  };
}

export async function findScreeningById(connection, id) {
  const sql = `
    SELECT
      s.ID_SCREENING,
      l.LOCATION_NAME,
      sc.SCREEN_NUMBER,
      m.MOVIE_TITLE,
      r.RATING_NAME,
      r.RATING_CODE,
      lg.LANGUAGE_NAME || ' [' || ml.LANGUAGE_TYPE || ']' AS LANGUAGE,
      vf.VIDEO_FORMAT_NAME || ' + ' || af.AUDIO_FORMAT_NAME AS AUDIOVISUAL_FORMAT,
      TO_CHAR(s.SCREENING_DATE, 'YYYY-MM-DD') AS SCREENING_DATE,
      TO_CHAR(s.SCREENING_DATE + s.SCREENING_START_TIME, 'HH24:MI') AS START_TIME,
      m.MOVIE_DURATION + sc.MAINTENANCE_TIME + sc.ADDS_TIME AS DURATION,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM PI_DEVELOPERS.SEAT_RECEIPTS sr
          WHERE sr.ID_SCREENING = s.ID_SCREENING
            AND NOT EXISTS (
              SELECT 1
              FROM PI_DEVELOPERS.REFUNDS rf
              WHERE rf.ID_RECEIPT = sr.ID_RECEIPT
            )
        ) THEN 1
        ELSE 0
      END AS HAS_SOLD_TICKETS
    ${SCREENINGS_SOURCE}
      JOIN PI_DEVELOPERS.RATINGS r ON r.ID_RATING = m.ID_RATING
      JOIN PI_DEVELOPERS.MOVIES_LANGUAGES ml ON ml.ID_MOVIE_LANGUAGE = s.ID_MOVIE_LANGUAGE
      JOIN PI_DEVELOPERS.LANGUAGES lg ON lg.ISO_CODE = ml.ISO_CODE
      JOIN PI_DEVELOPERS.AUDIOVISUAL_FORMATS avf ON avf.ID_AUDIOVISUAL_FORMAT = s.ID_AUDIOVISUAL_FORMAT
      JOIN PI_DEVELOPERS.VIDEO_FORMATS vf ON vf.ID_VIDEO_FORMAT = avf.ID_VIDEO_FORMAT
      JOIN PI_DEVELOPERS.AUDIO_FORMATS af ON af.ID_AUDIO_FORMAT = avf.ID_AUDIO_FORMAT
    WHERE s.ID_SCREENING = :id
      AND s.IS_DELETED = 0
      AND sc.IS_DELETED = 0
      AND l.IS_DELETED = 0
      AND mib.IS_DELETED = 0
      AND m.IS_DELETED = 0
  `;

  const result = await connection.execute(sql, { id }, OBJECT_FORMAT);

  return result.rows[0] ?? null;
}
