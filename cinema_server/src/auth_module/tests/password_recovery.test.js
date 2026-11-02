import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

jest.unstable_mockModule('../../email/email_service.js', () => ({
  default: {
    sendWelcomeEmail: jest.fn().mockResolvedValue(),
    sendPasswordRecoveryEmail: jest.fn().mockResolvedValue(),
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(),
  },
}));

const { default: authRoutes } = await import('../routes/auth_routes.js');
const { ROLES } = await import('../../session/session.js');

process.env.JWT_SECRET = 'test-secret';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

const EMAIL = 'admin.prueba@cinepi.com';
const CODE = '739983';
const NEW_PASSWORD = 'NuevaClave!Segura2026';

function mockDatabaseConnection(executeImplementation) {
  const connection = {
    execute: jest.fn(executeImplementation),
    close: jest.fn().mockResolvedValue(),
  };

  jest
    .spyOn(oracledb, 'getConnection')
    .mockResolvedValue(connection);

  return connection;
}

function recoveryAccount() {
  return {
    rows: [
      {
        ID: 7,
        ROLE: ROLES.CLIENT,
      },
    ],
  };
}

function recoveryCode(hash, isExpired = 0) {
  return {
    rows: [
      {
        ID_CODE: 1,
        HASH: hash,
        IS_EXPIRED: isExpired,
      },
    ],
  };
}

function recoveryRequestBody() {
  return {
    email: EMAIL,
  };
}

function recoveryVerificationBody(code = CODE) {
  return {
    email: EMAIL,
    code,
  };
}

function passwordResetBody(overrides = {}) {
  return {
    email: EMAIL,
    code: CODE,
    newPassword: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
    ...overrides,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

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
        return recoveryAccount();
        }

        if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return recoveryCode(codeHash);
        }

        return { rows: [] };
    });

    const response = await request(app)
        .post('/auth/password-recovery/verify')
        .send(recoveryVerificationBody());

    expect(response.status).toBe(200);
    expect(response.body.message).toBe(
        'Código de verificación válido'
    );
    });

  test('Returns 400 when the recovery code is incorrect', async () => {
    const codeHash = bcrypt.hashSync(CODE, 4);

    mockDatabaseConnection(async (sql) => {
        if (sql.includes('FROM PI_DEVELOPERS.CLIENTS')) {
        return recoveryAccount();
        }

        if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return recoveryCode(codeHash);
        }

        return { rows: [] };
    });

    const response = await request(app)
        .post('/auth/password-recovery/verify')
        .send(recoveryVerificationBody('111111'));

    expect(response.status).toBe(400);
    expect(response.body.errors.code).toBe(
        'El código de verificación es incorrecto'
    );
    });

  test('Returns 400 when the recovery code is expired', async () => {
    const codeHash = bcrypt.hashSync(CODE, 4);

    mockDatabaseConnection(async (sql) => {
        if (sql.includes('FROM PI_DEVELOPERS.CLIENTS')) {
        return recoveryAccount();
        }

        if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return recoveryCode(codeHash, 1);
        }

        return { rows: [] };
    });

    const response = await request(app)
        .post('/auth/password-recovery/verify')
        .send(recoveryVerificationBody());

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
        return recoveryAccount();
      }

      if (sql.includes('FROM PI_DEVELOPERS.CODES')) {
        return recoveryCode(codeHash);
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
        return { rowsAffected: 1 };
      }

      if (sql.includes('DELETE FROM PI_DEVELOPERS.CODES')) {
        return { rowsAffected: 1 };
      }

      return { rows: [] };
    });

    connection.commit = jest.fn().mockResolvedValue();

    const response = await request(app)
      .patch('/auth/password-recovery/reset')
      .send(passwordResetBody());

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
    expect(credentialUpdate[1].sessionVersion).toBe(1);

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
      .send(
        passwordResetBody({
          confirmPassword: 'OtraClave!2026',
        })
      );

    expect(response.status).toBe(400);
    expect(response.body.errors.confirmPassword).toBe(
      'Las contraseñas no coinciden'
    );
  });

  test('Returns 400 when new password is weak', async () => {
    const response = await request(app)
      .patch('/auth/password-recovery/reset')
      .send(
        passwordResetBody({
          newPassword: '123',
          confirmPassword: '123',
        })
      );

    expect(response.status).toBe(400);
    expect(response.body.errors.newPassword).toBe(
      'La contraseña es débil'
    );
  });
});