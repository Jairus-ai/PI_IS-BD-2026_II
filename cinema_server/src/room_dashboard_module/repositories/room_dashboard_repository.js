import oracledb from 'oracledb';
import { ROLES } from '../../session/session.js';

const OBJECT_FORMAT = { outFormat: oracledb.OUT_FORMAT_OBJECT };

const toSeconds = (column) =>
  `(EXTRACT(HOUR FROM ${column}) * 3600 + EXTRACT(MINUTE FROM ${column}) * 60 + EXTRACT(SECOND FROM ${column}))`;

const buildAccessibleRoomsQuery = (extraCondition = '') => `
  SELECT
    r.ID_SCREEN,
    r.SCREEN_TYPE,
    r.AMOUNT_SEATS,
    r.MAINTENANCE_TIME,
    r.ADDS_TIME,
    r.ID_LOCATION,
    l.LOCATION_NAME,
    'Sala ' || LPAD(r.ROOM_NUMBER, 2, '0') AS ROOM_NAME
  FROM (
    SELECT
      sc.ID_SCREEN,
      sc.SCREEN_TYPE,
      sc.AMOUNT_SEATS,
      sc.MAINTENANCE_TIME,
      sc.ADDS_TIME,
      sc.ID_LOCATION,
      sc.IS_DELETED,
      ROW_NUMBER() OVER (PARTITION BY sc.ID_LOCATION ORDER BY sc.ID_SCREEN) AS ROOM_NUMBER
    FROM PI_DEVELOPERS.SCREENS sc
  ) r
    JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = r.ID_LOCATION
  WHERE r.IS_DELETED = 0
    AND l.IS_DELETED = 0
    AND (
      :isSuperuser = 1
      OR EXISTS (
        SELECT 1
        FROM PI_DEVELOPERS.WORKER_LOCATIONS wl
        WHERE wl.ID_LOCATION = l.ID_LOCATION
          AND wl.ID_WORKER = :workerId
      )
    )
    ${extraCondition}
  ORDER BY l.LOCATION_NAME, r.ROOM_NUMBER
`;

const CLOCK_QUERY = `
  SELECT
    TO_CHAR(LOCALTIMESTAMP, 'YYYY-MM-DD') AS TODAY,
    EXTRACT(HOUR FROM LOCALTIMESTAMP) * 3600
      + EXTRACT(MINUTE FROM LOCALTIMESTAMP) * 60
      + TRUNC(EXTRACT(SECOND FROM LOCALTIMESTAMP)) AS NOW_SECONDS
  FROM DUAL
`;

const ROOM_SCREENINGS_QUERY = `
  SELECT
    s.ID_SCREENING,
    m.MOVIE_TITLE,
    m.MOVIE_DURATION,
    m.POSTER,
    s.MOVIE_LANGUAGE,
    s.MOVIE_FORMAT,
    ${toSeconds('s.SCREENING_START_TIME')} AS START_SECONDS,
    ${toSeconds('s.SCREENING_END_TIME')} AS END_SECONDS,
    (
      SELECT LISTAGG(g.GENRE_NAME, ', ') WITHIN GROUP (ORDER BY g.GENRE_NAME)
      FROM PI_DEVELOPERS.MOVIES_GENRES mg
        JOIN PI_DEVELOPERS.GENRES g ON g.ID_GENRE = mg.ID_GENRE
      WHERE mg.ID_MOVIE = m.ID_MOVIE
    ) AS GENRES,
    COUNT(CASE WHEN rf.ID_REFUND IS NULL THEN sr.ID_SEAT_RECEIPT END) AS TICKETS_SOLD,
    NVL(SUM(CASE WHEN rf.ID_REFUND IS NULL THEN sr.AMOUNT END), 0) AS REVENUE
  FROM PI_DEVELOPERS.SCREENINGS s
    JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = s.ID_MOVIE_IN_BILLBOARD
    JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
    LEFT JOIN PI_DEVELOPERS.SEAT_RECEIPTS sr
      ON sr.ID_SCREENING = s.ID_SCREENING AND sr.ID_SCREEN = s.ID_SCREEN
    LEFT JOIN PI_DEVELOPERS.REFUNDS rf ON rf.ID_RECEIPT = sr.ID_RECEIPT
  WHERE s.ID_SCREEN = :roomId
    AND TRUNC(s.SCREENING_DATE) = TO_DATE(:screeningDate, 'YYYY-MM-DD')
    AND s.IS_DELETED = 0
  GROUP BY
    s.ID_SCREENING,
    s.SCREENING_START_TIME,
    s.SCREENING_END_TIME,
    s.MOVIE_LANGUAGE,
    s.MOVIE_FORMAT,
    m.ID_MOVIE,
    m.MOVIE_TITLE,
    m.MOVIE_DURATION,
    m.POSTER
  ORDER BY s.SCREENING_START_TIME
`;

const ACTIVE_OVERRIDE_QUERY = `
  SELECT OVERRIDE_STATUS, TO_CHAR(EXPIRES_AT, 'HH24:MI') AS EXPIRES_AT
  FROM PI_DEVELOPERS.SCREEN_STATUS_OVERRIDES
  WHERE ID_SCREEN = :roomId
    AND EXPIRES_AT > LOCALTIMESTAMP
`;

const SAVE_OVERRIDE_QUERY = `
  MERGE INTO PI_DEVELOPERS.SCREEN_STATUS_OVERRIDES o
  USING (
    SELECT
      :roomId AS ID_SCREEN,
      :status AS OVERRIDE_STATUS,
      :workerId AS ID_WORKER,
      LOCALTIMESTAMP + NUMTODSINTERVAL(:minutes, 'MINUTE') AS EXPIRES_AT
    FROM DUAL
  ) src
  ON (o.ID_SCREEN = src.ID_SCREEN)
  WHEN MATCHED THEN UPDATE SET
    o.OVERRIDE_STATUS = src.OVERRIDE_STATUS,
    o.SET_AT = LOCALTIMESTAMP,
    o.EXPIRES_AT = src.EXPIRES_AT,
    o.ID_WORKER = src.ID_WORKER
  WHEN NOT MATCHED THEN INSERT (ID_SCREEN, OVERRIDE_STATUS, EXPIRES_AT, ID_WORKER)
    VALUES (src.ID_SCREEN, src.OVERRIDE_STATUS, src.EXPIRES_AT, src.ID_WORKER)
`;

const DELETE_OVERRIDE_QUERY = `
  DELETE FROM PI_DEVELOPERS.SCREEN_STATUS_OVERRIDES
  WHERE ID_SCREEN = :roomId
`;

function buildAccessBinds(user) {
  return {
    isSuperuser: user.role === ROLES.SUPERUSER ? 1 : 0,
    workerId: user.id
  };
}

export async function findAccessibleRooms(connection, user) {
  const result = await connection.execute(
    buildAccessibleRoomsQuery(),
    buildAccessBinds(user),
    OBJECT_FORMAT
  );
  return result.rows;
}

export async function findAccessibleRoom(connection, user, roomId) {
  const result = await connection.execute(
    buildAccessibleRoomsQuery('AND r.ID_SCREEN = :roomId'),
    { ...buildAccessBinds(user), roomId },
    OBJECT_FORMAT
  );
  return result.rows[0] ?? null;
}

export async function getDatabaseClock(connection) {
  const result = await connection.execute(CLOCK_QUERY, [], OBJECT_FORMAT);
  const row = result.rows[0];
  return { today: row.TODAY, nowSeconds: row.NOW_SECONDS };
}

export async function findRoomScreenings(connection, roomId, screeningDate) {
  const result = await connection.execute(
    ROOM_SCREENINGS_QUERY,
    { roomId, screeningDate },
    OBJECT_FORMAT
  );
  return result.rows;
}

export async function findActiveStatusOverride(connection, roomId) {
  const result = await connection.execute(ACTIVE_OVERRIDE_QUERY, { roomId }, OBJECT_FORMAT);
  return result.rows[0] ?? null;
}

export async function saveStatusOverride(connection, { roomId, status, workerId, minutes }) {
  await connection.execute(SAVE_OVERRIDE_QUERY, { roomId, status, workerId, minutes });
}

export async function deleteStatusOverride(connection, roomId) {
  await connection.execute(DELETE_OVERRIDE_QUERY, { roomId });
}