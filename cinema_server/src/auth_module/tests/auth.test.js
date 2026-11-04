import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

const mockSendPasswordChangedEmail =jest.fn().mockResolvedValue();

jest.unstable_mockModule('../../email/email_service.js',() => ({
  default: {
    sendWelcomeEmail:
      jest.fn().mockResolvedValue(),
    sendPasswordRecoveryEmail:
      jest.fn().mockResolvedValue(),
    sendPasswordChangedEmail:
      mockSendPasswordChangedEmail
    }
}));

const { default: authRoutes } = await import('../routes/auth_routes.js');
const { ROLES, createSessionToken, SESSION_COOKIE_NAME} = await import('../../session/session.js');

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

const PASSWORD = 'Pi!Prueba#test42';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

function accountRow(overrides = {}) {
  return {
    ID: 7,
    ROLE_CODE: 'CLIENT',
    EMAIL: 'adrian.prueba@ucr.ac.cr',
    FIRST_NAME: 'Adrián',
    FIRST_SURNAME: 'Arias',
    HASH: PASSWORD_HASH,
    SESSION_VERSION: 0,
    IS_TEMPORARY_PASSWORD:0,
    TEMPORARY_PASSWORD_EXPIRATION: null,
    ...overrides
  };
}

function mockDatabaseConnection(executeImplementation) {
  const connection = {
    execute: jest.fn(executeImplementation),
    close: jest.fn().mockResolvedValue()
  };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function temporaryCredentialRow(
  hash,
  expiration = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  )
) {
  return {
    HASH: hash,
    SESSION_VERSION: 0,
    IS_TEMPORARY_PASSWORD: 1,
    TEMPORARY_PASSWORD_EXPIRATION: expiration,
  };
}

function temporarySessionToken() {
  return createSessionToken({
    id: 7,
    role: ROLES.CLIENT,
    sessionVersion: 0,
    requiresPasswordChange: true,
  });
}

function temporaryPasswordChangeBody() {
  return {
    newPassword: 'NewPassword123!',
    confirmPassword: 'NewPassword123!',
  };
}

function temporaryAccountRow(expiration) {
  return accountRow({
    IS_TEMPORARY_PASSWORD: 1,
    TEMPORARY_PASSWORD_EXPIRATION: expiration,
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /auth/login', () => {
  test('Log in client 200 OK and starts a session', async () => {
    const connection = mockDatabaseConnection(async () => ({ rows: [accountRow()] }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'Adrian.Prueba@ucr.ac.cr', password: PASSWORD })
      .expect(200);

    expect(response.body.data).toEqual({
      id: 7,
      role: ROLES.CLIENT,
      email: 'adrian.prueba@ucr.ac.cr',
      firstName: 'Adrián',
      firstSurname: 'Arias'
    });
    expect(connection.execute.mock.calls[0][1]).toEqual({ email: 'adrian.prueba@ucr.ac.cr' });
    expect(response.headers['set-cookie'].join(';')).toMatch(/session_token=.*HttpOnly/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('Log in worker 200 OK with its role', async () => {
    mockDatabaseConnection(async () => ({
      rows: [accountRow({ ID: 3, ROLE_CODE: 'A', EMAIL: 'admin.prueba@cinepi.com' })]
    }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'admin.prueba@cinepi.com', password: PASSWORD })
      .expect(200);

    expect(response.body.data.role).toBe(ROLES.ADMINISTRATOR);
  });

  test('Log in 400 when fields are empty', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    const response = await request(app)
      .post('/auth/login')
      .send({})
      .expect(400);

    expect(response.body.errors).toEqual({
      email: 'Campo obligatorio',
      password: 'Campo obligatorio'
    });
    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('Log in 400 when email format is invalid', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'adrian@correo', password: PASSWORD })
      .expect(400);

    expect(response.body.errors.email).toBe('El correo electrónico no tiene un formato válido');
  });

  test('Log in 401 when the password is wrong', async () => {
    mockDatabaseConnection(async () => ({ rows: [accountRow()] }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'adrian.prueba@ucr.ac.cr', password: 'OtraClave#2026' })
      .expect(401);

    expect(response.body.errors.password).toBe('Correo o contraseña incorrectos');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test('Log in 401 with the same message when the email does not exist', async () => {
    mockDatabaseConnection(async () => ({ rows: [] }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'nadie@correo.com', password: PASSWORD })
      .expect(401);

    expect(response.body.errors.password).toBe('Correo o contraseña incorrectos');
  });

  test('Log in with temporary password requires password change', async () => {
    mockDatabaseConnection(async () => ({
      rows: [
        temporaryAccountRow(
          new Date(
            Date.now() + 24 * 60 * 60 * 1000
          )
        )
      ]
    }));

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'adrian.prueba@ucr.ac.cr',
        password: PASSWORD
      })
      .expect(200);

    expect(response.body.requiresPasswordChange)
      .toBe(true);

    expect(response.body.data).toEqual({
      id: 7,
      role: ROLES.CLIENT,
      email: 'adrian.prueba@ucr.ac.cr',
      firstName: 'Adrián',
      firstSurname: 'Arias'
    });

    expect(response.headers['set-cookie'].join(';')).toMatch(/session_token=.*HttpOnly/);
  });

  test('Log in 401 when temporary password is expired', async () => {
    mockDatabaseConnection(async () => ({
      rows: [
        temporaryAccountRow(
          new Date(
            Date.now() - 24 * 60 * 60 * 1000
          )
        )
      ]
    }));

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'adrian.prueba@ucr.ac.cr',
        password: PASSWORD
      })
      .expect(401);

    expect(response.body).toEqual({
      message:
        'La contraseña temporal ha expirado. Debes recuperar tu contraseña.',
      code: 'TEMPORARY_PASSWORD_EXPIRED'
    });

    expect(response.headers['set-cookie'])
      .toBeUndefined();
  });
});

describe('POST /auth/logout', () => {
  test('Log out invalidates the session in the server and clears the cookie', async () => {
    const connection = mockDatabaseConnection(async () => ({ rowsAffected: 1 }));
    const token = createSessionToken({ id: 7, role: ROLES.CLIENT, sessionVersion: 0 });

    const response = await request(app)
      .post('/auth/logout')
      .set('Cookie', sessionCookie(token))
      .expect(200);

    expect(response.body.message).toBe('Sesión cerrada correctamente');
    expect(connection.execute.mock.calls[0][0]).toMatch(/SESSION_VERSION = SESSION_VERSION \+ 1/);
    expect(connection.execute.mock.calls[0][0]).toMatch(/ID_CLIENT = :id/);
    expect(response.headers['set-cookie'].join(';')).toMatch(/session_token=;/);
  });

  test('Log out without a session does not fail', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    await request(app)
      .post('/auth/logout')
      .expect(200);

    expect(getConnectionSpy).not.toHaveBeenCalled();
  });
});

describe('GET /auth/me', () => {
  test('Returns the user of an active session', async () => {
    mockDatabaseConnection(async (sql) => (
      sql.includes('SESSION_VERSION')
        ? { rows: [[0]] }
        : { rows: [{ ID: 3, EMAIL: 'admin.prueba@cinepi.com', FIRST_NAME: 'Admin', FIRST_SURNAME: 'Prueba' }] }
    ));
    const token = createSessionToken({ id: 3, role: ROLES.ADMINISTRATOR, sessionVersion: 0 });

    const response = await request(app)
      .get('/auth/me')
      .set('Cookie', sessionCookie(token))
      .expect(200);

    expect(response.body.data).toEqual({
      id: 3,
      role: ROLES.ADMINISTRATOR,
      email: 'admin.prueba@cinepi.com',
      firstName: 'Admin',
      firstSurname: 'Prueba'
    });
  });

  test('Returns 401 after the session was closed', async () => {
    mockDatabaseConnection(async () => ({ rows: [[1]] }));
    const oldToken = createSessionToken({ id: 3, role: ROLES.ADMINISTRATOR, sessionVersion: 0 });

    const response = await request(app)
      .get('/auth/me')
      .set('Cookie', sessionCookie(oldToken))
      .expect(401);

    expect(response.body.message).toBe('La sesión expiró. Inicia sesión de nuevo');
  });

  test('Returns 403 when password change is required', async () => {
    mockDatabaseConnection(async () => ({
      rows: [[0]]
    }));

    const temporaryToken = temporarySessionToken();

    const response = await request(app)
      .get('/auth/me')
      .set(
        'Cookie',
        sessionCookie(temporaryToken)
      )
      .expect(403);

    expect(response.body).toEqual({
      message:
        'Debes cambiar tu contraseña antes de continuar.',
      code: 'PASSWORD_CHANGE_REQUIRED'
    });
  });
});

describe('PATCH /auth/change-password', () => {
  function clientSessionToken() {
    return createSessionToken({
      id: 7,
      role: ROLES.CLIENT,
      sessionVersion: 0
    });
  }

  test('Changes password successfully', async () => {
    const currentHash = await bcrypt.hash('OldPassword123!', 10);

    const connection = mockDatabaseConnection(async (sql) => {
      // requireSession()
      if (sql.includes('SELECT SESSION_VERSION')) {
        return { rows: [[0]] };
      }

      // changePassword() - buscar credenciales actuales
      if (sql.includes('SELECT HASH, SESSION_VERSION')) {
        return {
          rows: [
            {
              HASH: currentHash,
              SESSION_VERSION: 0
            }
          ]
        };
      }

      // changePassword() - actualizar contraseña
      if (sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')) {
        return { rowsAffected: 1 };
      }

      return { rows: [] };
    });

    connection.commit = jest.fn().mockResolvedValue();

    const token = clientSessionToken();

    const response = await request(app)
      .patch('/auth/change-password')
      .set('Cookie', sessionCookie(token))
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      })
      .expect(200);

    expect(response.body).toEqual({
      message: 'La contraseña ha sido cambiada correctamente'
    });

    expect(connection.commit).toHaveBeenCalledTimes(1);

    const updateCall = connection.execute.mock.calls.find(
      ([sql]) => sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')
    );

    expect(updateCall).toBeDefined();
    expect(updateCall[1].sessionVersion).toBe(1);

    expect(response.headers['set-cookie'].join(';'))
      .toMatch(/session_token=/);
  });

  test('Returns 400 when current password is incorrect', async () => {
    const currentHash = await bcrypt.hash('OldPassword123!', 10);

    const connection = mockDatabaseConnection(async (sql) => {
      if (sql.includes('SELECT SESSION_VERSION')) {
        return { rows: [[0]] };
      }

      if (sql.includes('SELECT HASH, SESSION_VERSION')) {
        return {
          rows: [
            {
              HASH: currentHash,
              SESSION_VERSION: 0
            }
          ]
        };
      }

      return { rows: [] };
    });

    connection.commit = jest.fn();

    const token = clientSessionToken();

    const response = await request(app)
      .patch('/auth/change-password')
      .set('Cookie', sessionCookie(token))
      .send({
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      })
      .expect(400);

    expect(response.body).toEqual({
      errors: {
        currentPassword: 'La contraseña actual es incorrecta'
      }
    });

    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 400 when change password fields are empty', async () => {
    mockDatabaseConnection(async () => ({
      rows: [[0]]
    }));

    const token = clientSessionToken();

    const response = await request(app)
      .patch('/auth/change-password')
      .set('Cookie', sessionCookie(token))
      .send({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      .expect(400);

    expect(response.body.errors).toEqual({
      currentPassword: 'Campo obligatorio',
      newPassword: 'Campo obligatorio',
      confirmPassword: 'Campo obligatorio'
    });
  });

  test('Returns 400 when new passwords do not match', async () => {
    mockDatabaseConnection(async () => ({
      rows: [[0]]
    }));

    const token = clientSessionToken();

    const response = await request(app)
      .patch('/auth/change-password')
      .set('Cookie', sessionCookie(token))
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'DifferentPassword123!'
      })
      .expect(400);

    expect(response.body.errors.confirmPassword)
      .toBe('Las contraseñas no coinciden');
  });

  test('Returns 400 when new password is weak', async () => {
    mockDatabaseConnection(async () => ({
      rows: [[0]]
    }));

    const token = clientSessionToken();

    const response = await request(app)
      .patch('/auth/change-password')
      .set('Cookie', sessionCookie(token))
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: '123456',
        confirmPassword: '123456'
      })
      .expect(400);

    expect(response.body.errors.newPassword)
      .toBe('La contraseña es débil');
  });

  test('Returns 401 when changing password without session', async () => {
    await request(app)
      .patch('/auth/change-password')
      .send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      })
      .expect(401);
  });

  test('Changes temporary password successfully', async () => {
    const temporaryHash = await bcrypt.hash(
      'TemporaryPassword123!',
      10
    );

    const connection = mockDatabaseConnection(async (sql) => {
      // requireSession()
      if (sql.includes('SELECT SESSION_VERSION')) {
        return {
          rows: [[0]]
        };
      }

      // getCredential()
      if (
        sql.includes('HASH') &&
        sql.includes('SESSION_VERSION') &&
        sql.includes('FROM PI_DEVELOPERS.CREDENTIALS')
      ) {
        return {
          rows: [
            temporaryCredentialRow(
              temporaryHash
            )
          ]
        };
      }

      // updatePasswordAndSessionVersion()
      if (sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')) {
        return {
          rowsAffected: 1
        };
      }

      return {
        rows: []
      };
    });

    connection.commit = jest.fn().mockResolvedValue();

    const temporaryToken = temporarySessionToken();

    const response = await request(app)
      .patch('/auth/change-password')
      .set(
        'Cookie',
        sessionCookie(temporaryToken)
      )
      .send(temporaryPasswordChangeBody())
      .expect(200);

    expect(response.body).toEqual({
      message:
        'La contraseña ha sido cambiada correctamente'
    });

    const updateCall =
      connection.execute.mock.calls.find(
        ([sql]) =>
          sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')
      );

    expect(updateCall).toBeDefined();

    expect(updateCall[0])
      .toMatch(/IS_TEMPORARY_PASSWORD\s*=\s*0/);

    expect(updateCall[0])
      .toMatch(/TEMPORARY_PASSWORD_EXPIRATION\s*=\s*NULL/);

    expect(connection.commit)
      .toHaveBeenCalledTimes(1);

    expect(response.headers['set-cookie'].join(';'))
      .toMatch(/session_token=/);
  });

  test('Sends confirmation email after temporary password change', async () => {
    const temporaryHash = await bcrypt.hash(
      'TemporaryPassword123!',
      10
    );

    const connection = mockDatabaseConnection(async (sql) => {
      // requireSession()
      if (sql.includes('SELECT SESSION_VERSION')) {
        return {
          rows: [[0]]
        };
      }

      // getCredential()
      if (
        sql.includes('HASH') &&
        sql.includes('SESSION_VERSION') &&
        sql.includes('FROM PI_DEVELOPERS.CREDENTIALS')
      ) {
        return {
          rows: [
            temporaryCredentialRow(
              temporaryHash
            )
          ]
        };
      }

      // updatePasswordAndSessionVersion()
      if (sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')) {
        return {
          rowsAffected: 1
        };
      }

      // getAccountEmail()
      if (sql.includes('SELECT EMAIL')) {
        return {
          rows: [
            {
              EMAIL: 'adrian.prueba@ucr.ac.cr'
            }
          ]
        };
      }

      return {
        rows: []
      };
    });

    connection.commit = jest.fn().mockResolvedValue();

    const temporaryToken = temporarySessionToken();

    await request(app)
      .patch('/auth/change-password')
      .set(
        'Cookie',
        sessionCookie(temporaryToken)
      )
      .send(temporaryPasswordChangeBody())
      .expect(200);

    expect(mockSendPasswordChangedEmail)
      .toHaveBeenCalledTimes(1);

    expect(mockSendPasswordChangedEmail)
      .toHaveBeenCalledWith({
        email: 'adrian.prueba@ucr.ac.cr'
      });
  });

  test('Allows temporary session to establish password without current password', async () => {
    
    const temporaryHash = await bcrypt.hash('TemporaryPassword123!', 10);
    const connection = mockDatabaseConnection(async (sql) => {
      // requireSession()
      if (sql.includes('SELECT SESSION_VERSION')) {
        return { rows: [[0]] };
      }

      // getCredential()
      if (sql.includes('SELECT HASH, SESSION_VERSION')) {
        return {
          rows: [
            temporaryCredentialRow(
              temporaryHash
            )
          ]
        };
      }

      // updatePasswordAndSessionVersion()
      if (sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')) {
        return { rowsAffected: 1 };
      }

      return { rows: [] };
    });

    connection.commit = jest.fn().mockResolvedValue();

    const token = temporarySessionToken();

    const response = await request(app)
      .patch('/auth/change-password')
      .set('Cookie', sessionCookie(token))
      .send(temporaryPasswordChangeBody())
      .expect(200);

    expect(response.body).toEqual({
      message: 'La contraseña ha sido cambiada correctamente',
    });

    expect(connection.commit).toHaveBeenCalledTimes(1);

    const updateCall = connection.execute.mock.calls.find(
      ([sql]) =>
        sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')
    );

    expect(updateCall).toBeDefined();

    expect(updateCall[0]).toMatch(
      /IS_TEMPORARY_PASSWORD = 0/
    );

    expect(updateCall[0]).toMatch(
      /TEMPORARY_PASSWORD_EXPIRATION = NULL/
    );

    expect(response.headers['set-cookie'].join(';')).toMatch(
      /session_token=/
    );
  });
});
