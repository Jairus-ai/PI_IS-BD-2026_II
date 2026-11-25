import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { ROLES } from '../../session/session.js';
import { SCREEN_MESSAGES, validateScreen } from '../validators/screen_validator.js';

const OBJECT_FORMAT = { outFormat: oracledb.OUT_FORMAT_OBJECT };
const LOCATION_ACCESS_CONDITION = `
  (
    :isSuperuser = 1
    OR EXISTS (
      SELECT 1
      FROM PI_DEVELOPERS.WORKER_LOCATIONS wl
      WHERE wl.ID_LOCATION = l.ID_LOCATION
        AND wl.ID_WORKER = :workerId
    )
  )
`;

const buildAccessibleScreensQuery = (extraCondition = '') => `
  SELECT
    sc.ID_SCREEN,
    sc.SCREEN_NUMBER,
    'Sala ' || LPAD(sc.SCREEN_NUMBER, 2, '0') AS SCREEN_NAME,
    sc.SCREEN_TYPE,
    sc.AMOUNT_ROWS,
    sc.AMOUNT_SEATS_PER_ROWS,
    sc.AMOUNT_SEATS,
    sc.MAINTENANCE_TIME,
    sc.ADDS_TIME,
    sc.ID_LOCATION,
    l.LOCATION_NAME
  FROM PI_DEVELOPERS.SCREENS sc
    JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = sc.ID_LOCATION
  WHERE sc.IS_DELETED = 0
    AND l.IS_DELETED = 0
    AND ${LOCATION_ACCESS_CONDITION}
    ${extraCondition}
  ORDER BY l.LOCATION_NAME ASC, sc.SCREEN_NUMBER ASC
`;

const ACCESSIBLE_SCREENS_QUERY = buildAccessibleScreensQuery();
const ACCESSIBLE_SCREEN_BY_ID_QUERY = buildAccessibleScreensQuery('AND sc.ID_SCREEN = :screenId');
const ACCESSIBLE_LOCATIONS_QUERY = `
  SELECT l.ID_LOCATION, l.LOCATION_NAME
  FROM PI_DEVELOPERS.LOCATIONS l
  WHERE l.IS_DELETED = 0
    AND ${LOCATION_ACCESS_CONDITION}
  ORDER BY l.LOCATION_NAME ASC
`;
const ACCESSIBLE_LOCATION_BY_ID_QUERY = `
  SELECT l.ID_LOCATION
  FROM PI_DEVELOPERS.LOCATIONS l
  WHERE l.ID_LOCATION = :locationId
    AND l.IS_DELETED = 0
    AND ${LOCATION_ACCESS_CONDITION}
`;

const INSERT_SCREEN_QUERY = `
  INSERT INTO PI_DEVELOPERS.SCREENS
    (SCREEN_NUMBER, SCREEN_TYPE, AMOUNT_SEATS, AMOUNT_ROWS, AMOUNT_SEATS_PER_ROWS, MAINTENANCE_TIME, ADDS_TIME, ID_LOCATION)
  VALUES (
    (SELECT NVL(MAX(SCREEN_NUMBER), 0) + 1 FROM PI_DEVELOPERS.SCREENS WHERE ID_LOCATION = :locationId),
    :screenType, :rowCount * :seatsPerRow, :rowCount, :seatsPerRow, :maintenanceTime, :addsTime, :locationId
  )
  RETURNING ID_SCREEN INTO :screenId
`;

const UNIQUE_CONSTRAINT_ERROR = 1;
const MAX_INSERT_ATTEMPTS = 3;

export function getAccessBinds(user) {
  return {
    isSuperuser: user.role === ROLES.SUPERUSER ? 1 : 0,
    workerId: user.id
  };
}

async function canManageLocation(connection, user, locationId) {
  const result = await connection.execute(
    ACCESSIBLE_LOCATION_BY_ID_QUERY,
    { ...getAccessBinds(user), locationId },
    OBJECT_FORMAT
  );
  return result.rows.length > 0;
}

async function insertScreen(connection, screen) {
  const binds = {
    screenType: screen.type,
    rowCount: screen.rows,
    seatsPerRow: screen.seatsPerRow,
    maintenanceTime: screen.maintenanceTime,
    addsTime: screen.addsTime,
    locationId: screen.locationId,
    screenId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
  };

  for (let attempt = 1; ; attempt++) {
    try {
      const result = await connection.execute(INSERT_SCREEN_QUERY, binds);
      return result.outBinds.screenId[0];
    } catch (error) {
      if (error.errorNum !== UNIQUE_CONSTRAINT_ERROR || attempt === MAX_INSERT_ATTEMPTS) {
        throw error;
      }
    }
  }
}

export const getScreenList = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(ACCESSIBLE_SCREENS_QUERY, getAccessBinds(req.user), OBJECT_FORMAT);
    res.status(200).json({ data: result.rows });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getScreenLocations = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(ACCESSIBLE_LOCATIONS_QUERY, getAccessBinds(req.user), OBJECT_FORMAT);
    res.status(200).json({ data: result.rows });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const addScreen = async (req, res, next) => {
  const { errors, screen } = validateScreen(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;
  try {
    connection = await getConnection();
    if (!await canManageLocation(connection, req.user, screen.locationId)) {
      return res.status(400).json({ errors: { locationId: SCREEN_MESSAGES.location } });
    }

    const screenId = await insertScreen(connection, screen);
    await connection.commit();

    const createdResult = await connection.execute(
      ACCESSIBLE_SCREEN_BY_ID_QUERY,
      { ...getAccessBinds(req.user), screenId },
      OBJECT_FORMAT
    );

    res.status(201).json({ data: createdResult.rows[0] });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
