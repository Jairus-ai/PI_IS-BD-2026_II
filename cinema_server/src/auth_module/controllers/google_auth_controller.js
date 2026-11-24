import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { ROLES, createSessionToken, setSessionCookie } from '../../session/session.js';
import emailService from '../../email/email_service.js';
import { createClientRecord } from '../../shared/services/user_creation_service.js';
import { updatePasswordAndSessionVersion } from '../../shared/services/credential_service.js';
import { validateUniqueUserData } from '../../shared/validators/user_data_validator.js';
import {
  GOOGLE_PROVIDER,
  buildGoogleAuthorizationUrl,
  consumeGoogleState,
  fetchGoogleProfile,
  storePendingSignUp,
  readPendingSignUp,
  clearPendingSignUp
} from '../services/google_oauth_service.js';
import {
  findClientByIdentity,
  findClientByEmail,
  workerEmailExists,
  linkIdentity,
  insertClientCredential,
  createUnusablePasswordHash
} from '../services/oauth_identity_service.js';
import { validateGoogleSignUp } from '../validators/google_auth_validator.js';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
//RUtas provisionales
const FRONTEND_HOME_PATH = '/';
const FRONTEND_LOGIN_PATH = '/login';
const FRONTEND_COMPLETE_PATH = '/signup/google';

const UNIQUE_CONSTRAINT_ERROR = 1;
const INITIAL_SESSION_VERSION = 0;
const PENDING_EXPIRED_MESSAGE = 'El registro con Google expiró. Intenta de nuevo';
const DUPLICATE_USER_MESSAGE = 'Ya existe un usuario con esos datos';

const LOGGED_IN = 'LOGGED_IN';
const STAFF_EMAIL = 'STAFF_EMAIL';
const NEW_CLIENT = 'NEW_CLIENT';

function redirectToLogin(res, errorCode) {
  return res.redirect(`${CLIENT_ORIGIN}${FRONTEND_LOGIN_PATH}?error=${errorCode}`);
}

function openClientSession(res, id, sessionVersion) {
  setSessionCookie(
    res,
    createSessionToken({ id, role: ROLES.CLIENT, sessionVersion })
  );
}

async function rollbackQuietly(connection) {
  await connection?.rollback().catch((error) => {
    console.error('Failed to rollback the transaction: ', error);
  });
}

async function resolveGoogleLogin(connection, profile) {
  const linked = await findClientByIdentity(
    connection,
    GOOGLE_PROVIDER,
    profile.providerUserId
  );
  if (linked) {
    return { status: LOGGED_IN, id: linked.ID, sessionVersion: linked.SESSION_VERSION };
  }

  if (await workerEmailExists(connection, profile.email)) {
    return { status: STAFF_EMAIL };
  }

  const existing = await findClientByEmail(connection, profile.email);
  if (!existing) {
    return { status: NEW_CLIENT };
  }

  // Cliente registrado con contraseña: se vincula a Google
  await linkIdentity(connection, GOOGLE_PROVIDER, profile.providerUserId, existing.ID);

  // Por seguridad la contraseña anterior deja de servir y se cierran sesiones abiertas
  const sessionVersion = await updatePasswordAndSessionVersion(
    connection,
    ROLES.CLIENT,
    existing.ID,
    await createUnusablePasswordHash(),
    existing.SESSION_VERSION
  );

  await connection.commit();
  return { status: LOGGED_IN, id: existing.ID, sessionVersion };
}

export const startGoogleLogin = (req, res, next) => {
  try {
    res.redirect(buildGoogleAuthorizationUrl(res));
  } catch (error) {
    next(error);
  }
};

export const handleGoogleCallback = async (req, res) => {
  const oauthState = consumeGoogleState(req, res);
  const { code, state, error } = req.query;

  if (error) {
    return redirectToLogin(res, 'google_cancelled');
  }
  if (!oauthState || typeof code !== 'string' || state !== oauthState.state) {
    return redirectToLogin(res, 'google_state_invalid');
  }

  let connection;
  try {
    const profile = await fetchGoogleProfile(code, oauthState.codeVerifier);
    if (!profile.emailVerified || !profile.email) {
      return redirectToLogin(res, 'google_email_not_verified');
    }

    connection = await getConnection();
    const outcome = await resolveGoogleLogin(connection, profile);

    if (outcome.status === STAFF_EMAIL) {
      return redirectToLogin(res, 'google_staff_not_allowed');
    }

    if (outcome.status === NEW_CLIENT) {
      storePendingSignUp(res, profile);
      return res.redirect(`${CLIENT_ORIGIN}${FRONTEND_COMPLETE_PATH}`);
    }

    openClientSession(res, outcome.id, outcome.sessionVersion);
    return res.redirect(`${CLIENT_ORIGIN}${FRONTEND_HOME_PATH}`);
  } catch (error) {
    console.error('Google sign-in failed: ', error);
    await rollbackQuietly(connection);
    return redirectToLogin(res, 'google_failed');
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getPendingGoogleSignUp = (req, res) => {
  const pending = readPendingSignUp(req);
  if (!pending) {
    return res.status(401).json({ message: PENDING_EXPIRED_MESSAGE });
  }

  const { email, firstName, middleName, firstSurname, lastSurname } = pending;
  res.status(200).json({
    data: { email, firstName, middleName, firstSurname, lastSurname }
  });
};

export const completeGoogleSignUp = async (req, res, next) => {
  const pending = readPendingSignUp(req);
  if (!pending) {
    return res.status(401).json({ message: PENDING_EXPIRED_MESSAGE });
  }

  const { errors, client } = validateGoogleSignUp(pending, req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;
  try {
    connection = await getConnection();

    const duplicateErrors = await validateUniqueUserData(connection, client);
    if (Object.keys(duplicateErrors).length > 0) {
      return res.status(409).json({ errors: duplicateErrors });
    }

    const idClient = await createClientRecord(connection, client);
    await insertClientCredential(connection, idClient, await createUnusablePasswordHash());
    await linkIdentity(connection, GOOGLE_PROVIDER, pending.providerUserId, idClient);
    await connection.commit();

    clearPendingSignUp(res);
    emailService.sendWelcomeEmail(client).catch((emailError) => {
      console.error('Failed to send the welcome email: ', emailError);
    });
    openClientSession(res, idClient, INITIAL_SESSION_VERSION);

    res.status(201).json({
      data: {
        id: idClient,
        role: ROLES.CLIENT,
        email: client.email,
        firstName: client.firstName,
        firstSurname: client.firstSurname
      }
    });
  } catch (error) {
    await rollbackQuietly(connection);

    if (error?.errorNum === UNIQUE_CONSTRAINT_ERROR) {
      return res.status(409).json({ message: DUPLICATE_USER_MESSAGE });
    }
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};