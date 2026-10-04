import oracledb from 'oracledb';

import {
  getConnection,
  closeDatabaseConnection,
} from '../../database/database.js';


const VALID_ROLES = [
  'CLIENT',
  'SUPERUSER',
  'ADMINISTRATOR',
  'EMPLOYEE',
];

const VALID_STATUSES = [
  'ACTIVE',
  'INACTIVE',
];


const buildUserFilters = (queryParams) => {
  const { role, locationId, status, name } = queryParams;

  const conditions = [];
  const workerConditions = [];
  const binds = {};

  // Filter by role
  if (role) {
    const normalizedRole = String(role).toUpperCase();

    if (!VALID_ROLES.includes(normalizedRole)) {
      const error = new Error('Invalid role filter');
      error.status = 400;
      throw error;
    }

    conditions.push('u.ROLE = :role');
    binds.role = normalizedRole;
  }

  // Filter by status
  if (status) {
    const normalizedStatus = String(status).toUpperCase();

    if (!VALID_STATUSES.includes(normalizedStatus)) {
      const error = new Error('Invalid status filter');
      error.status = 400;
      throw error;
    }

    conditions.push('u.STATUS = :status');
    binds.status = normalizedStatus;
  }

  // Search by name
  if (name && String(name).trim() !== '') {
    conditions.push(`
      LOWER(
        u.FIRST_NAME || ' ' ||
        NVL(u.MIDDLE_NAME, '') || ' ' ||
        u.FIRST_SURNAME || ' ' ||
        NVL(u.LAST_SURNAME, '')
      ) LIKE :name
    `);

    binds.name = `%${String(name).trim().toLowerCase()}%`;
  }

  // Filter workers by location
  if (locationId) {
    const parsedLocationId = Number(locationId);

    if (!Number.isInteger(parsedLocationId) || parsedLocationId <= 0) {
      const error = new Error('Invalid location filter');
      error.status = 400;
      throw error;
    }

    workerConditions.push(`
      EXISTS (
        SELECT 1
        FROM PI_DEVELOPERS.WORKER_LOCATIONS wl_filter
        WHERE wl_filter.ID_WORKER = w.ID_WORKER
          AND wl_filter.ID_LOCATION = :locationId
      )
    `);

    binds.locationId = parsedLocationId;
  }

  const whereClause =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  const workerWhereClause =
    workerConditions.length > 0
      ? `WHERE ${workerConditions.join(' AND ')}`
      : '';

  return {
    whereClause,
    workerWhereClause,
    binds,
  };
};


export const getUsersList = async (req, res, next) => {
  let connection;

  try {
    const {
      whereClause,
      workerWhereClause,
      binds,
    } = buildUserFilters(req.query);

    connection = await getConnection();

    const sql = `
      WITH USERS_BASE AS (

        -- Clients
        SELECT
          'CLIENT-' || c.ID_CLIENT AS USER_KEY,
          c.ID_CLIENT AS USER_ID,
          'CLIENT' AS ROLE,
          c.FIRST_NAME,
          c.MIDDLE_NAME,
          c.FIRST_SURNAME,
          c.LAST_SURNAME,
          c.IDENTIFICATION_NUMBER,
          c.EMAIL,
          c.BIRTHDATE,
          c.PHONE_NUMBER,
          'ACTIVE' AS STATUS,
          CAST(NULL AS VARCHAR2(4000)) AS LOCATIONS
        FROM PI_DEVELOPERS.CLIENTS c

        UNION ALL

        -- Workers
        SELECT
          'WORKER-' || w.ID_WORKER AS USER_KEY,
          w.ID_WORKER AS USER_ID,

          CASE w.ROLE
            WHEN 'S' THEN 'SUPERUSER'
            WHEN 'A' THEN 'ADMINISTRATOR'
            WHEN 'E' THEN 'EMPLOYEE'
          END AS ROLE,

          w.FIRST_NAME,
          w.MIDDLE_NAME,
          w.FIRST_SURNAME,
          w.LAST_SURNAME,
          w.IDENTIFICATION_NUMBER,
          w.EMAIL,
          w.BIRTHDATE,
          w.PHONE_NUMBER,

          CASE w.IS_ACTIVE
            WHEN 1 THEN 'ACTIVE'
            ELSE 'INACTIVE'
          END AS STATUS,

          LISTAGG(l.LOCATION_NAME, ', ')
            WITHIN GROUP (ORDER BY l.LOCATION_NAME) AS LOCATIONS

        FROM PI_DEVELOPERS.WORKERS w

        LEFT JOIN PI_DEVELOPERS.WORKER_LOCATIONS wl
          ON w.ID_WORKER = wl.ID_WORKER

        LEFT JOIN PI_DEVELOPERS.LOCATIONS l
          ON wl.ID_LOCATION = l.ID_LOCATION
          AND l.IS_DELETED = 0

        ${workerWhereClause}

        GROUP BY
          w.ID_WORKER,
          w.ROLE,
          w.FIRST_NAME,
          w.MIDDLE_NAME,
          w.FIRST_SURNAME,
          w.LAST_SURNAME,
          w.IDENTIFICATION_NUMBER,
          w.EMAIL,
          w.BIRTHDATE,
          w.PHONE_NUMBER,
          w.IS_ACTIVE
      )

      SELECT
        u.USER_KEY,
        u.USER_ID,
        u.ROLE,
        u.FIRST_NAME,
        u.MIDDLE_NAME,
        u.FIRST_SURNAME,
        u.LAST_SURNAME,
        u.IDENTIFICATION_NUMBER,
        u.EMAIL,
        u.BIRTHDATE,
        u.PHONE_NUMBER,
        u.STATUS,
        u.LOCATIONS

      FROM USERS_BASE u

      ${whereClause}

      ORDER BY
        u.FIRST_NAME ASC,
        u.FIRST_SURNAME ASC
    `;

    const result = await connection.execute(
      sql,
      binds,
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      }
    );

    res.status(200).json({
      data: result.rows,
    });

  } catch (error) {
    next(error);

  } finally {
    await closeDatabaseConnection(connection);
  }
};