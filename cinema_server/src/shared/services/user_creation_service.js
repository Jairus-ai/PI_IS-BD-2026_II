import oracledb from 'oracledb';

const INSERT_CLIENT_SQL = `
  INSERT INTO PI_DEVELOPERS.CLIENTS (
    EMAIL,
    IDENTIFICATION_TYPE,
    IDENTIFICATION_NUMBER,
    PHONE_NUMBER,
    FIRST_NAME,
    MIDDLE_NAME,
    FIRST_SURNAME,
    LAST_SURNAME,
    BIRTHDATE
  ) VALUES (
    :email,
    :identificationType,
    :identificationNumber,
    :phoneNumber,
    :firstName,
    :middleName,
    :firstSurname,
    :lastSurname,
    TO_DATE(:birthdate, 'YYYY-MM-DD')
  )
  RETURNING ID_CLIENT INTO :idClient
`;

const INSERT_WORKER_SQL = `
  INSERT INTO PI_DEVELOPERS.WORKERS (
    EMAIL,
    IDENTIFICATION_TYPE,
    IDENTIFICATION_NUMBER,
    PHONE_NUMBER,
    FIRST_NAME,
    MIDDLE_NAME,
    FIRST_SURNAME,
    LAST_SURNAME,
    BIRTHDATE,
    ROLE,
    IS_ACTIVE
  ) VALUES (
    :email,
    :identificationType,
    :identificationNumber,
    :phoneNumber,
    :firstName,
    :middleName,
    :firstSurname,
    :lastSurname,
    TO_DATE(:birthdate, 'YYYY-MM-DD'),
    :roleCode,
    1
  )
  RETURNING ID_WORKER INTO :idWorker
`;

const INSERT_WORKER_LOCATION_SQL = `
  INSERT INTO PI_DEVELOPERS.WORKER_LOCATIONS (
    ID_WORKER,
    ID_LOCATION
  ) VALUES (
    :idWorker,
    :idLocation
  )
`;

export async function createClientRecord(connection, client) {
  const result = await connection.execute(
    INSERT_CLIENT_SQL,
    {
      ...client,
      idClient: {
        dir: oracledb.BIND_OUT,
        type: oracledb.NUMBER
      }
    }
  );

  return result.outBinds.idClient[0];
}

export async function createWorkerRecord(connection, worker, roleCode) {
  const result = await connection.execute(
    INSERT_WORKER_SQL,
    {
      ...worker,
      roleCode,
      idWorker: {
        dir: oracledb.BIND_OUT,
        type: oracledb.NUMBER
      }
    }
  );

  return result.outBinds.idWorker[0];
}

export async function createWorkerLocations(connection, idWorker, locations) {
  for (const idLocation of locations) {
    await connection.execute(
      INSERT_WORKER_LOCATION_SQL,
      {
        idWorker,
        idLocation
      }
    );
  }
}