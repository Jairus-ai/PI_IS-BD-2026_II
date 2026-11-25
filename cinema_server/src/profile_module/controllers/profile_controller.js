import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { ROLES } from '../../session/session.js';
import { normalizeProfileData, validateProfileData } from '../validators/profile_validator.js';

const PROFILE_NOT_FOUND_MESSAGE = 'No se encontró la información personal';
const OBJECT_FORMAT = { outFormat: oracledb.OUT_FORMAT_OBJECT };

const WORKER_ROLE_NAMES = { S: ROLES.SUPERUSER, A: ROLES.ADMINISTRATOR, E: ROLES.EMPLOYEE };

//only personal data selected
const PROFILE_COLUMNS = `
  EMAIL,
  IDENTIFICATION_TYPE,
  IDENTIFICATION_NUMBER,
  PHONE_NUMBER,
  FIRST_NAME,
  MIDDLE_NAME,
  FIRST_SURNAME,
  LAST_SURNAME,
  TO_CHAR(BIRTHDATE, 'YYYY-MM-DD') AS BIRTHDATE
`;

const CLIENT_PROFILE_QUERY = `
  SELECT ${PROFILE_COLUMNS}, NULL AS ROLE
  FROM PI_DEVELOPERS.CLIENTS
  WHERE ID_CLIENT = :id
`;

const WORKER_PROFILE_QUERY = `
  SELECT ${PROFILE_COLUMNS}, ROLE
  FROM PI_DEVELOPERS.WORKERS
  WHERE ID_WORKER = :id
    AND IS_ACTIVE = 1
`;

const WORKER_LOCATIONS_QUERY = `
  SELECT l.ID_LOCATION, l.LOCATION_NAME
  FROM PI_DEVELOPERS.WORKER_LOCATIONS wl
    JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = wl.ID_LOCATION
  WHERE wl.ID_WORKER = :id
    AND l.IS_DELETED = 0
  ORDER BY l.LOCATION_NAME
`;

const UPDATE_COLUMNS = `
  FIRST_NAME = :firstName,
  MIDDLE_NAME = :middleName,
  FIRST_SURNAME = :firstSurname,
  LAST_SURNAME = :lastSurname,
  PHONE_NUMBER = :phoneNumber
`;

const UPDATE_CLIENT_QUERY = `
  UPDATE PI_DEVELOPERS.CLIENTS
  SET ${UPDATE_COLUMNS}
  WHERE ID_CLIENT = :id
`;

const UPDATE_WORKER_QUERY = `
  UPDATE PI_DEVELOPERS.WORKERS
  SET ${UPDATE_COLUMNS}
  WHERE ID_WORKER = :id
    AND IS_ACTIVE = 1
`;

const isClient = (user) => user.role === ROLES.CLIENT;

function toProfile(row, locations, role) {
  return {
    email: row.EMAIL,
    identificationType: row.IDENTIFICATION_TYPE,
    identificationNumber: row.IDENTIFICATION_NUMBER,
    phoneNumber: row.PHONE_NUMBER,
    firstName: row.FIRST_NAME,
    middleName: row.MIDDLE_NAME ?? '',
    firstSurname: row.FIRST_SURNAME,
    lastSurname: row.LAST_SURNAME ?? '',
    birthdate: row.BIRTHDATE,
    role: role === ROLES.CLIENT ? ROLES.CLIENT : WORKER_ROLE_NAMES[row.ROLE] ?? role,
    //clients dont have locations, null hides the section
    locations: role === ROLES.CLIENT
      ? null
      : locations.map((location) => ({ id: location.ID_LOCATION, name: location.LOCATION_NAME }))
  };
}

async function findProfile(connection, user) {
  const result = await connection.execute(
    isClient(user) ? CLIENT_PROFILE_QUERY : WORKER_PROFILE_QUERY,
    { id: user.id },
    OBJECT_FORMAT
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }

  let locations = [];
  if (!isClient(user)) {
    const locationsResult = await connection.execute(WORKER_LOCATIONS_QUERY, { id: user.id }, OBJECT_FORMAT);
    locations = locationsResult.rows;
  }
  return toProfile(row, locations, user.role);
}

//id comes from session, so users can only read or change their own data
export const getProfile = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const profile = await findProfile(connection, req.user);
    if (!profile) {
      return res.status(404).json({ message: PROFILE_NOT_FOUND_MESSAGE });
    }
    res.status(200).json({ data: profile });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const updateProfile = async (req, res, next) => {
  const changes = normalizeProfileData(req.body);
  let connection;
  try {
    connection = await getConnection();
    const current = await findProfile(connection, req.user);
    if (!current) {
      return res.status(404).json({ message: PROFILE_NOT_FOUND_MESSAGE });
    }

    const errors = validateProfileData(changes, current.phoneNumber);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    await connection.execute(
      isClient(req.user) ? UPDATE_CLIENT_QUERY : UPDATE_WORKER_QUERY,
      {
        ...changes,
        middleName: changes.middleName || null,
        lastSurname: changes.lastSurname || null,
        id: req.user.id
      },
      { autoCommit: true }
    );

    res.status(200).json({
      data: {
        ...current,
        ...changes
      }
    });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
