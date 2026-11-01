import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

import authRoutes from '../routes/auth_routes.js';
import { ROLES, createSessionToken, SESSION_COOKIE_NAME } from '../../session/session.js';

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
});

const EMAIL = 'admin.prueba@cinepi.com';
const CODE = '739983';
const NEW_PASSWORD = 'NuevaClave!Segura2026';

describe('POST /auth/password-recovery/request', () => {
  test('Generates a recovery code for a registered email', async () => {
    const connection = mockDatabaseConnection(async (sql) => {
      if (sql.includes('FROM PI_DEVELOPERS.CLIENTS')) {
        return {
          rows: [
            {
              ID: 7,
              ROLE: ROLES.CLIENT,
            },
          ],
        };
      }

      if (sql.includes('SELECT ID_CODE')) {
        return {
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO PI_DEVELOPERS.CODES')) {
        return {
          rowsAffected: 1,
        };
      }

      return { rows: [] };
    });

    connection.commit = jest.fn().mockResolvedValue();

    const response = await request(app)
      .post('/auth/password-recovery/request')
      .send({
        email: EMAIL,
      });

    expect(response.status).toBe(200);

    expect(response.body.message).toContain(
      'Código de verificación generado'
    );

    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('Returns 404 when the email does not exist', async () => {
    mockDatabaseConnection(async () => ({
      rows: [],
    }));

    const response = await request(app)
      .post('/auth/password-recovery/request')
      .send({
        email: 'noexiste@cinepi.com',
      });

    expect(response.status).toBe(404);

    expect(response.body.errors.email).toBe(
      'No existe una cuenta registrada con este correo'
    );
  });
});

describe('POST /auth/password-recovery/verify', () => {
  test('Verifies a valid recovery code', async () => {
    const codeHash = bcrypt.hashSync(CODE, 4);

    mockDatabaseConnection(async (sql) => {
      if (sql.includes('FROM PI_DEVELOPERS.CLIENTS')) {
        return {
          rows: [
            {
              ID: 7,
              ROLE: ROLES.CLIENT,
            },
          ],
        };
      }

      if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return {
          rows: [
            {
              ID_CODE: 1,
              HASH: codeHash,
              IS_EXPIRED: 0,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const response = await request(app)
      .post('/auth/password-recovery/verify')
      .send({
        email: EMAIL,
        code: CODE,
      });

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      'Código de verificación válido'
    );
  });

  test('Returns 400 when the recovery code is incorrect', async () => {
    const codeHash = bcrypt.hashSync(CODE, 4);

    mockDatabaseConnection(async (sql) => {
      if (sql.includes('FROM PI_DEVELOPERS.CLIENTS')) {
        return {
          rows: [
            {
              ID: 7,
              ROLE: ROLES.CLIENT,
            },
          ],
        };
      }

      if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return {
          rows: [
            {
              ID_CODE: 1,
              HASH: codeHash,
              IS_EXPIRED: 0,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const response = await request(app)
      .post('/auth/password-recovery/verify')
      .send({
        email: EMAIL,
        code: '111111',
      });

    expect(response.status).toBe(400);

    expect(response.body.errors.code).toBe(
      'El código de verificación es incorrecto'
    );
  });

  test('Returns 400 when the recovery code is expired', async () => {
    const codeHash = bcrypt.hashSync(CODE, 4);

    mockDatabaseConnection(async (sql) => {
      if (sql.includes('FROM PI_DEVELOPERS.CLIENTS')) {
        return {
          rows: [
            {
              ID: 7,
              ROLE: ROLES.CLIENT,
            },
          ],
        };
      }

      if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return {
          rows: [
            {
              ID_CODE: 1,
              HASH: codeHash,
              IS_EXPIRED: 1,
            },
          ],
        };
      }

      return { rows: [] };
    });

    const response = await request(app)
      .post('/auth/password-recovery/verify')
      .send({
        email: EMAIL,
        code: CODE,
      });

    expect(response.status).toBe(400);

    expect(response.body.errors.code).toBe(
      'El código de verificación ha expirado'
    );
  });
});

describe('PATCH /auth/password-recovery/reset', () => {
  test('Resets password successfully', async () => {
    const codeHash = bcrypt.hashSync(CODE, 4);
    const oldPasswordHash = bcrypt.hashSync(
      'ClaveAnterior!2026',
      4
    );

    const connection = mockDatabaseConnection(async (sql) => {
      if (sql.includes('FROM PI_DEVELOPERS.CLIENTS')) {
        return {
          rows: [
            {
              ID: 7,
              ROLE: ROLES.CLIENT,
            },
          ],
        };
      }

      if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return {
          rows: [
            {
              ID_CODE: 1,
              HASH: codeHash,
              IS_EXPIRED: 0,
            },
          ],
        };
      }

      if (
        sql.includes('SELECT HASH, SESSION_VERSION') &&
        sql.includes('PI_DEVELOPERS.CREDENTIALS')
      ) {
        return {
          rows: [
            {
              HASH: oldPasswordHash,
              SESSION_VERSION: 0,
            },
          ],
        };
      }

      if (sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')) {
        return {
          rowsAffected: 1,
        };
      }

      if (sql.includes('DELETE FROM PI_DEVELOPERS.CODES')) {
        return {
          rowsAffected: 1,
        };
      }

      return { rows: [] };
    });

    connection.commit = jest.fn().mockResolvedValue();

    const response = await request(app)
      .patch('/auth/password-recovery/reset')
      .send({
        email: EMAIL,
        code: CODE,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

    expect(response.status).toBe(200);

    expect(response.body.message).toBe(
      'La contraseña ha sido cambiada correctamente'
    );

    expect(connection.commit).toHaveBeenCalledTimes(1);

    const credentialUpdate = connection.execute.mock.calls.find(
      ([sql]) =>
        sql.includes('UPDATE PI_DEVELOPERS.CREDENTIALS')
    );

    expect(credentialUpdate).toBeDefined();

    expect(
      credentialUpdate[1].sessionVersion
    ).toBe(1);

    const deleteCode = connection.execute.mock.calls.find(
      ([sql]) =>
        sql.includes('DELETE FROM PI_DEVELOPERS.CODES')
    );

    expect(deleteCode).toBeDefined();

    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('Returns 400 when new passwords do not match', async () => {
    const response = await request(app)
      .patch('/auth/password-recovery/reset')
      .send({
        email: EMAIL,
        code: CODE,
        newPassword: NEW_PASSWORD,
        confirmPassword: 'OtraClave!2026',
      });

    expect(response.status).toBe(400);

    expect(response.body.errors.confirmPassword).toBe(
      'Las contraseñas no coinciden'
    );
  });

  test('Returns 400 when new password is weak', async () => {
    const response = await request(app)
      .patch('/auth/password-recovery/reset')
      .send({
        email: EMAIL,
        code: CODE,
        newPassword: '123',
        confirmPassword: '123',
      });

    expect(response.status).toBe(400);

    expect(response.body.errors.newPassword).toBe(
      'La contraseña es débil'
    );
  });
});