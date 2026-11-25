import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { ROLES, createSessionToken, setSessionCookie } from '../../session/session.js';
import emailService from '../../email/email_service.js';
import { createClientRecord } from '../../shared/services/user_creation_service.js';
import { updatePasswordAndSessionVersion } from '../../shared/services/credential_service.js';
import { validateUniqueUserData } from '../../shared/validators/user_data_validator.js';
import {
  consumeOAuthState,
  storePendingSignUp,
  readPendingSignUp,
  clearPendingSignUp
} from '../services/oauth_cookie_service.js';
import {
  findClientByIdentity,
  findClientByEmail,
  workerEmailExists,
  linkIdentity,
  insertClientCredential,
  createUnusablePasswordHash
} from '../services/oauth_identity_service.js';
import { validateOAuthSignUp } from '../validators/oauth_signup_validator.js';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const FRONTEND_HOME_PATH = '/';
const FRONTEND_LOGIN_PATH = '/login';

const UNIQUE_CONSTRAINT_ERROR = 1;
const INITIAL_SESSION_VERSION = 0;
const PENDING_EXPIRED_MESSAGE = 'El registro expiró. Intenta de nuevo';
const DUPLICATE_USER_MESSAGE = 'Ya existe un usuario con esos datos';

const LOGGED_IN = 'LOGGED_IN';
const STAFF_EMAIL = 'STAFF_EMAIL';
const NEW_CLIENT = 'NEW_CLIENT';

function redirectToLogin(res, provider, reason) {
  const code = `${provider.name.toLowerCase()}_${reason}`;
  return res.redirect(`${CLIENT_ORIGIN}${FRONTEND_LOGIN_PATH}?error=${code}`);
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

async function resolveOAuthLogin(connection, providerName, profile) {
  const linked = await findClientByIdentity(connection, providerName, profile.providerUserId);
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

  await linkIdentity(connection, providerName, profile.providerUserId, existing.ID);

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

export function createOAuthController(provider) {
  const start = (req, res, next) => {
    try {
      res.redirect(provider.buildAuthorizationUrl(res));
    } catch (error) {
      next(error);
    }
  };

  const callback = async (req, res) => {
    const oauthState = consumeOAuthState(req, res, provider.name);
    const { code, state, error } = req.query;

    if (error) {
      return redirectToLogin(res, provider, 'cancelled');
    }
    if (!oauthState || typeof code !== 'string' || state !== oauthState.state) {
      return redirectToLogin(res, provider, 'state_invalid');
    }

    let connection;
    try {
      const profile = await provider.fetchProfile(code, oauthState);
      if (!profile.email) {
        return redirectToLogin(res, provider, 'email_missing');
      }
      if (!profile.emailVerified) {
        return redirectToLogin(res, provider, 'email_not_verified');
      }

      connection = await getConnection();
      const outcome = await resolveOAuthLogin(connection, provider.name, profile);

      if (outcome.status === STAFF_EMAIL) {
        return redirectToLogin(res, provider, 'staff_not_allowed');
      }

      if (outcome.status === NEW_CLIENT) {
        storePendingSignUp(res, provider.name, profile);
        return res.redirect(`${CLIENT_ORIGIN}${provider.signUpPath}`);
      }

      openClientSession(res, outcome.id, outcome.sessionVersion);
      return res.redirect(`${CLIENT_ORIGIN}${FRONTEND_HOME_PATH}`);
    } catch (callbackError) {
      console.error(`${provider.name} sign-in failed: `, callbackError);
      await rollbackQuietly(connection);
      return redirectToLogin(res, provider, 'failed');
    } finally {
      await closeDatabaseConnection(connection);
    }
  };

  const getPending = (req, res) => {
    const pending = readPendingSignUp(req, provider.name);
    if (!pending) {
      return res.status(401).json({ message: PENDING_EXPIRED_MESSAGE });
    }

    const { email, firstName, middleName, firstSurname, lastSurname } = pending;
    res.status(200).json({
      data: { email, firstName, middleName, firstSurname, lastSurname }
    });
  };

  const complete = async (req, res, next) => {
    const pending = readPendingSignUp(req, provider.name);
    if (!pending) {
      return res.status(401).json({ message: PENDING_EXPIRED_MESSAGE });
    }

    const { errors, client } = validateOAuthSignUp(pending, req.body);
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
      await linkIdentity(connection, provider.name, pending.providerUserId, idClient);
      await connection.commit();

      clearPendingSignUp(res, provider.name);
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
    } catch (completeError) {
      await rollbackQuietly(connection);

      if (completeError?.errorNum === UNIQUE_CONSTRAINT_ERROR) {
        return res.status(409).json({ message: DUPLICATE_USER_MESSAGE });
      }
      next(completeError);
    } finally {
      await closeDatabaseConnection(connection);
    }
  };

  return { start, callback, getPending, complete };
}