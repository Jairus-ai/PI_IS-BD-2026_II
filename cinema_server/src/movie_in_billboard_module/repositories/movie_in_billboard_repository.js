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
    ORDER BY
      CASE
        WHEN mib.CLOSING_DATE >= TRUNC(CURRENT_DATE) THEN 0
        ELSE 1
      END ASC,
      mib.OPENING_DATE DESC,
      m.MOVIE_TITLE ASC,
      l.LOCATION_NAME ASC
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
      m.POSTER,
      mib.ID_MOVIE,
      mib.ID_LOCATION,
      mib.PREMIER
    ${MOVIES_IN_BILLBOARDS_SOURCE}
    WHERE mib.ID_MOVIE_IN_BILLBOARD = :id
      AND mib.IS_DELETED = 0
      AND m.IS_DELETED = 0
      AND l.IS_DELETED = 0
  `;

  const result = await connection.execute(sql, { id }, OBJECT_FORMAT);

  return result.rows[0] ?? null;
}

export async function hasOverlappingMovieInBillboard(connection, movieInBillboard, excludedId = null) {
  const conditions = [
    'ID_MOVIE = :movieId',
    'ID_LOCATION = :locationId',
    'IS_DELETED = 0',
    "OPENING_DATE <= TO_DATE(:closingDate, 'YYYY-MM-DD')",
    "CLOSING_DATE >= TO_DATE(:openingDate, 'YYYY-MM-DD')"
  ];
  const binds = {
    movieId: movieInBillboard.movieId,
    locationId: movieInBillboard.locationId,
    openingDate: movieInBillboard.openingDate,
    closingDate: movieInBillboard.closingDate
  };

  if (excludedId) {
    conditions.push('ID_MOVIE_IN_BILLBOARD <> :excludedId');
    binds.excludedId = excludedId;
  }

  const sql = `
    SELECT 1
    FROM PI_DEVELOPERS.MOVIES_IN_BILLBOARDS
    WHERE ${conditions.join(' AND ')}
    FETCH FIRST 1 ROWS ONLY
  `;

  const result = await connection.execute(sql, binds, OBJECT_FORMAT);

  return result.rows.length > 0;
}

export async function hasPremierMovieInBillboard(connection, movieInBillboard, excludedId = null) {
  const conditions = [
    'ID_MOVIE = :movieId',
    'ID_LOCATION = :locationId',
    'PREMIER = 1',
    'IS_DELETED = 0'
  ];
  const binds = {
    movieId: movieInBillboard.movieId,
    locationId: movieInBillboard.locationId
  };

  if (excludedId) {
    conditions.push('ID_MOVIE_IN_BILLBOARD <> :excludedId');
    binds.excludedId = excludedId;
  }

  const sql = `
    SELECT 1
    FROM PI_DEVELOPERS.MOVIES_IN_BILLBOARDS
    WHERE ${conditions.join(' AND ')}
    FETCH FIRST 1 ROWS ONLY
  `;

  const result = await connection.execute(sql, binds, OBJECT_FORMAT);

  return result.rows.length > 0;
}

export async function insertMovieInBillboard(connection, movieInBillboard) {
  const sql = `
    INSERT INTO PI_DEVELOPERS.MOVIES_IN_BILLBOARDS
      (OPENING_DATE, CLOSING_DATE, PREMIER, ID_LOCATION, ID_MOVIE)
    VALUES (
      TO_DATE(:openingDate, 'YYYY-MM-DD'),
      TO_DATE(:closingDate, 'YYYY-MM-DD'),
      :premier,
      :locationId,
      :movieId
    )
    RETURNING ID_MOVIE_IN_BILLBOARD INTO :movieInBillboardId
  `;

  const binds = {
    openingDate: movieInBillboard.openingDate,
    closingDate: movieInBillboard.closingDate,
    premier: movieInBillboard.premier
      ? 1
      : 0,
    locationId: movieInBillboard.locationId,
    movieId: movieInBillboard.movieId,
    movieInBillboardId: {
      dir: oracledb.BIND_OUT,
      type: oracledb.NUMBER
    }
  };

  const result = await connection.execute(sql, binds, { autoCommit: true });

  return result.outBinds.movieInBillboardId[0];
}

export async function hasScreeningsOutsideMovieInBillboard(connection, id, movieInBillboard) {
  const sql = `
    SELECT 1
    FROM PI_DEVELOPERS.SCREENINGS s
      JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = s.ID_MOVIE_IN_BILLBOARD
    WHERE s.ID_MOVIE_IN_BILLBOARD = :id
      AND s.IS_DELETED = 0
      AND (
        mib.ID_MOVIE <> :movieId
        OR mib.ID_LOCATION <> :locationId
        OR s.SCREENING_DATE < TO_DATE(:openingDate, 'YYYY-MM-DD')
        OR s.SCREENING_DATE > TO_DATE(:closingDate, 'YYYY-MM-DD')
      )
    FETCH FIRST 1 ROWS ONLY
  `;

  const binds = {
    id,
    movieId: movieInBillboard.movieId,
    locationId: movieInBillboard.locationId,
    openingDate: movieInBillboard.openingDate,
    closingDate: movieInBillboard.closingDate
  };

  const result = await connection.execute(sql, binds, OBJECT_FORMAT);

  return result.rows.length > 0;
}

export async function updateMovieInBillboardById(connection, id, movieInBillboard) {
  const sql = `
    UPDATE PI_DEVELOPERS.MOVIES_IN_BILLBOARDS
    SET
      OPENING_DATE = TO_DATE(:openingDate, 'YYYY-MM-DD'),
      CLOSING_DATE = TO_DATE(:closingDate, 'YYYY-MM-DD'),
      PREMIER = :premier,
      ID_LOCATION = :locationId,
      ID_MOVIE = :movieId
    WHERE ID_MOVIE_IN_BILLBOARD = :id
      AND IS_DELETED = 0
  `;

  const binds = {
    openingDate: movieInBillboard.openingDate,
    closingDate: movieInBillboard.closingDate,
    premier: movieInBillboard.premier
      ? 1
      : 0,
    locationId: movieInBillboard.locationId,
    movieId: movieInBillboard.movieId,
    id
  };

  const result = await connection.execute(sql, binds, { autoCommit: true });

  return result.rowsAffected;
}

export async function hasActiveScreenings(connection, id) {
  const sql = `
    SELECT 1
    FROM PI_DEVELOPERS.SCREENINGS
    WHERE ID_MOVIE_IN_BILLBOARD = :id
      AND IS_DELETED = 0
    FETCH FIRST 1 ROWS ONLY
  `;

  const result = await connection.execute(sql, { id }, OBJECT_FORMAT);

  return result.rows.length > 0;
}

export async function softDeleteMovieInBillboard(connection, id) {
  const sql = `
    UPDATE PI_DEVELOPERS.MOVIES_IN_BILLBOARDS
    SET IS_DELETED = 1
    WHERE ID_MOVIE_IN_BILLBOARD = :id
      AND IS_DELETED = 0
  `;

  const result = await connection.execute(sql, { id }, { autoCommit: true });

  return result.rowsAffected;
}
