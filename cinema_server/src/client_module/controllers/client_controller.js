import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { validateClientRegistration } from '../validators/client_validator.js';
import { createSessionToken, setSessionCookie } from '../../session/session.js';
import emailService from '../../email/email_service.js';

const HASH_SALT_ROUNDS = 10;
const UNIQUE_CONSTRAINT_ERROR = 1;
const CLIENT_ROLE = 'CLIENT';
const DUPLICATE_FIELD_ERRORS = {
  UQ_CLIENT_EMAIL: { email: 'Ya existe un usuario con ese correo' },
  UQ_CLIENT_IDENTIFICATION: { identificationNumber: 'Ya existe un usuario con esa identificación' }
};

const INSERT_CLIENT_SQL = `
  INSERT INTO PI_DEVELOPERS.CLIENTS (
    EMAIL, IDENTIFICATION_TYPE, IDENTIFICATION_NUMBER, PHONE_NUMBER,
    FIRST_NAME, MIDDLE_NAME, FIRST_SURNAME, LAST_SURNAME, BIRTHDATE
  ) VALUES (
    :email, :identificationType, :identificationNumber, :phoneNumber,
    :firstName, :middleName, :firstSurname, :lastSurname, TO_DATE(:birthdate, 'YYYY-MM-DD')
  )
  RETURNING ID_CLIENT INTO :idClient
`;

const INSERT_CREDENTIAL_SQL = `
  INSERT INTO PI_DEVELOPERS.CREDENTIALS (HASH, ID_CLIENT)
  VALUES (:passwordHash, :idClient)
`;

function findDuplicateFieldError(error) {
  if (error?.errorNum !== UNIQUE_CONSTRAINT_ERROR) {
    return null;
  }
  const constraintName = Object.keys(DUPLICATE_FIELD_ERRORS)
    .find((name) => error.message?.includes(name));
  return constraintName ? DUPLICATE_FIELD_ERRORS[constraintName] : null;
}

async function rollbackTransaction(connection) {
  if (!connection) {
    return;
  }
  try {
    await connection.rollback();
  } catch (error) {
    console.error('Failed to rollback the transaction: ', error);
  }
}

export const registerClient = async (req, res, next) => {
  const { errors, passwordSuggestions, client, password } = validateClientRegistration(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors, passwordSuggestions });
  }

  let connection;

  try {
    const passwordHash = await bcrypt.hash(password, HASH_SALT_ROUNDS);
    connection = await getConnection();

    const clientResult = await connection.execute(INSERT_CLIENT_SQL, {
      ...client,
      idClient: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    });
    const idClient = clientResult.outBinds.idClient[0];

    await connection.execute(INSERT_CREDENTIAL_SQL, { passwordHash, idClient });
    const sessionToken = createSessionToken({ id: idClient, role: CLIENT_ROLE });
    await connection.commit();

    emailService.sendWelcomeEmail(client).catch((error) => {
      console.error('Failed to send the welcome email: ', error);
    });
    setSessionCookie(res, sessionToken);
    
    res.status(201).json({
      data: {
        idClient,
        email: client.email,
        firstName: client.firstName,
        firstSurname: client.firstSurname
      }
    });
  } catch (error) {
    await rollbackTransaction(connection);

    const duplicateFieldError = findDuplicateFieldError(error);
    if (duplicateFieldError) {
      return res.status(409).json({ errors: duplicateFieldError });
    }

    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
