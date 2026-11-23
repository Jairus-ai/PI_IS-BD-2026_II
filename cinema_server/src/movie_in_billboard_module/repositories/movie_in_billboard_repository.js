import oracledb from 'oracledb';

const PAGE_LIMIT = 10;

const OBJECT_FORMAT = {
  outFormat: oracledb.OUT_FORMAT_OBJECT
};

const MOVIES_IN_BILLBOARDS_SOURCE = `
  FROM PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib
    JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
    JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = mib.ID_LOCATION
    JOIN PI_DEVELOPERS.RATINGS r ON r.ID_RATING = m.ID_RATING
`;

export function buildMovieInBillboardFilters({ locationId, ratingId, movieName } = {}) {
  const conditions = [
    'mib.IS_DELETED = 0',
    'm.IS_DELETED = 0',
    'l.IS_DELETED = 0'
  ];
  const binds = {};

  if (locationId) {
    conditions.push('mib.ID_LOCATION = :locationId');
    binds.locationId = locationId;
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

export async function countMoviesInBillboards(connection, queryParams) {
  const { whereClause, binds } = buildMovieInBillboardFilters(queryParams);

  const sql = `
    SELECT COUNT(*) AS TOTAL
    ${MOVIES_IN_BILLBOARDS_SOURCE}
    ${whereClause}
  `;

  const result = await connection.execute(sql, binds, OBJECT_FORMAT);

  return result.rows[0].TOTAL;
}

export async function listMoviesInBillboards(connection, queryParams, page) {
  const offset = (page - 1) * PAGE_LIMIT;
  const { whereClause, binds } = buildMovieInBillboardFilters(queryParams);

  const sql = `
    SELECT
      mib.ID_MOVIE_IN_BILLBOARD,
      m.MOVIE_TITLE,
      l.LOCATION_NAME,
      TO_CHAR(mib.OPENING_DATE, 'YYYY-MM-DD') AS OPENING_DATE,
      TO_CHAR(mib.CLOSING_DATE, 'YYYY-MM-DD') AS CLOSING_DATE,
      r.RATING_NAME
    ${MOVIES_IN_BILLBOARDS_SOURCE}
    ${whereClause}
    ORDER BY mib.OPENING_DATE DESC, m.MOVIE_TITLE ASC, l.LOCATION_NAME ASC
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

export async function findMovieInBillboardById(connection, id) {
  const sql = `
    SELECT
      mib.ID_MOVIE_IN_BILLBOARD,
      m.MOVIE_TITLE,
      l.LOCATION_NAME,
      TO_CHAR(mib.OPENING_DATE, 'YYYY-MM-DD') AS OPENING_DATE,
      TO_CHAR(mib.CLOSING_DATE, 'YYYY-MM-DD') AS CLOSING_DATE,
      r.RATING_NAME,
      r.RATING_CODE,
      m.MOVIE_DURATION,
      m.POSTER
    ${MOVIES_IN_BILLBOARDS_SOURCE}
    WHERE mib.ID_MOVIE_IN_BILLBOARD = :id
      AND mib.IS_DELETED = 0
      AND m.IS_DELETED = 0
      AND l.IS_DELETED = 0
  `;

  const result = await connection.execute(sql, { id }, OBJECT_FORMAT);

  return result.rows[0] ?? null;
}
