import {beforeEach, describe, expect, jest, test} from '@jest/globals';

import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();
const mockSendTemporaryPasswordEmail = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

jest.unstable_mockModule('../../email/email_service.js', () => ({
  default: {
    sendTemporaryPasswordEmail:
      mockSendTemporaryPasswordEmail,
  },
}));

let currentUserRole = 'SUPERUSER';

jest.unstable_mockModule('../../session/session.js', () => {
  const ROLES = {
    CLIENT: 'CLIENT',
    SUPERUSER: 'SUPERUSER',
    ADMINISTRATOR: 'ADMINISTRATOR',
    EMPLOYEE: 'EMPLOYEE',
  };

  return {
    ROLES,

    requireSession: () => (req, res, next) => {
      req.user = {
        id: 1,
        role: currentUserRole,
      };

      next();
    },
  };
});

const { default: userRoutes } =
  await import('../routes/user_routes.js');

const app = express();

app.use(express.json());
app.use('/management/users', userRoutes);

app.use((error, req, res, next) => {
  const status = error.status || 500;

  res.status(status).json({
    message:
      status === 500
        ? 'No fue posible completar la operación.'
        : error.message,
  });
});

function validUser(overrides = {}) {
  return {
    email: 'nuevo@cinepi.com',
    firstName: 'Juan',
    middleName: '',
    firstSurname: 'Mora',
    lastSurname: 'Rojas',
    identificationType: 'C',
    identificationNumber: '123456789',
    birthdate: '2000-05-10',
    phoneNumber: '88888888',
    role: 'CLIENT',
    locations: [],
    ...overrides,
  };
}

function noDuplicates() {
  return {
    rows: [
      {
        EMAIL_EXISTS: 0,
        IDENTIFICATION_EXISTS: 0,
      },
    ],
  };
}

function duplicateResult({
  emailExists = 0,
  identificationExists = 0,
} = {}) {
  return {
    rows: [
      {
        EMAIL_EXISTS: emailExists,
        IDENTIFICATION_EXISTS:
          identificationExists,
      },
    ],
  };
}

function createMockConnection(executeResults = []) {
  const execute = jest.fn();

  for (const result of executeResults) {
    execute.mockResolvedValueOnce(result);
  }

  return {
    execute,
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
  };
}

function useConnection(executeResults) {
  const connection =
    createMockConnection(executeResults);

  mockGetConnection.mockResolvedValue(connection);

  return connection;
}

beforeEach(() => {
  jest.clearAllMocks();

  currentUserRole = 'SUPERUSER';

  mockCloseDatabaseConnection.mockResolvedValue();

  mockSendTemporaryPasswordEmail
    .mockResolvedValue();
});

describe('POST /management/users', () => {
  test('Create client 201 Created', async () => {
    const connection = useConnection([
      noDuplicates(),
      {
        outBinds: {
          idClient: [20],
        },
      },
      {
        rowsAffected: 1,
      },
    ]);

    const response = await request(app)
      .post('/management/users')
      .send(validUser())
      .expect(201);

    expect(response.body).toEqual({
      message:
        'El usuario fue registrado correctamente.',
      data: {
        id: 20,
        role: 'CLIENT',
        email: 'nuevo@cinepi.com',
        firstName: 'Juan',
        firstSurname: 'Mora',
      },
    });

    expect(connection.execute)
      .toHaveBeenCalledTimes(3);

    expect(connection.commit)
      .toHaveBeenCalledTimes(1);

    expect(connection.rollback)
      .not.toHaveBeenCalled();

    expect(mockSendTemporaryPasswordEmail)
      .toHaveBeenCalledWith({
        email: 'nuevo@cinepi.com',
        firstName: 'Juan',
        temporaryPassword: expect.any(String),
      });

    expect(mockCloseDatabaseConnection)
      .toHaveBeenCalledTimes(1);
  });

  test('Create employee 201 Created', async () => {
    const connection = useConnection([
      noDuplicates(),
      {
        outBinds: {
          idWorker: [30],
        },
      },
      {
        rowsAffected: 1,
      },
      {
        rowsAffected: 1,
      },
      {
        rowsAffected: 1,
      },
    ]);

    const response = await request(app)
      .post('/management/users')
      .send(
        validUser({
          email: 'empleado@cinepi.com',
          firstName: 'Ana',
          identificationNumber: '987654321',
          role: 'EMPLOYEE',
          locations: [1, 2],
        })
      )
      .expect(201);

    expect(response.body).toEqual({
      message:
        'El usuario fue registrado correctamente.',
      data: {
        id: 30,
        role: 'EMPLOYEE',
        email: 'empleado@cinepi.com',
        firstName: 'Ana',
        firstSurname: 'Mora',
      },
    });

    expect(connection.execute)
      .toHaveBeenCalledTimes(5);

    expect(connection.commit)
      .toHaveBeenCalledTimes(1);

    expect(connection.rollback)
      .not.toHaveBeenCalled();

    expect(mockSendTemporaryPasswordEmail)
      .toHaveBeenCalledWith({
        email: 'empleado@cinepi.com',
        firstName: 'Ana',
        temporaryPassword: expect.any(String),
      });
  });

  test('Create user 409 when email already exists', async () => {
    const connection = useConnection([
      duplicateResult({
        emailExists: 1,
      }),
    ]);

    const response = await request(app)
      .post('/management/users')
      .send(
        validUser({
          email: 'existente@cinepi.com',
          identificationNumber: '111222333',
        })
      )
      .expect(409);

    expect(response.body).toEqual({
      errors: {
        email:
          'Ya existe un usuario con ese correo',
      },
    });

    expect(connection.execute)
      .toHaveBeenCalledTimes(1);

    expect(connection.commit)
      .not.toHaveBeenCalled();

    expect(mockSendTemporaryPasswordEmail)
      .not.toHaveBeenCalled();
  });

  test('Create user 409 when identification already exists', async () => {
    const connection = useConnection([
      duplicateResult({
        identificationExists: 1,
      }),
    ]);

    const response = await request(app)
      .post('/management/users')
      .send(
        validUser({
          email: 'nuevo2@cinepi.com',
        })
      )
      .expect(409);

    expect(response.body).toEqual({
      errors: {
        identificationNumber:
          'Ya existe un usuario con esa identificación',
      },
    });

    expect(connection.execute)
      .toHaveBeenCalledTimes(1);

    expect(connection.commit)
      .not.toHaveBeenCalled();

    expect(mockSendTemporaryPasswordEmail)
      .not.toHaveBeenCalled();
  });

  test('Create employee 400 when creator is employee', async () => {
    currentUserRole = 'EMPLOYEE';

    const response = await request(app)
      .post('/management/users')
      .send(
        validUser({
          email: 'otro@cinepi.com',
          identificationNumber: '555666777',
          role: 'EMPLOYEE',
          locations: [1],
        })
      )
      .expect(400);

    expect(response.body.errors.role)
      .toBe(
        'No tienes permisos para registrar usuarios con este rol'
      );

    expect(mockGetConnection)
      .not.toHaveBeenCalled();

    expect(mockSendTemporaryPasswordEmail)
      .not.toHaveBeenCalled();
  });

  test('Create employee 400 without locations', async () => {
    const response = await request(app)
      .post('/management/users')
      .send(
        validUser({
          email: 'empleado2@cinepi.com',
          identificationNumber: '444555666',
          role: 'EMPLOYEE',
        })
      )
      .expect(400);

    expect(response.body.errors.locations)
      .toBe(
        'Debes seleccionar al menos una sucursal'
      );

    expect(mockGetConnection)
      .not.toHaveBeenCalled();

    expect(mockSendTemporaryPasswordEmail)
      .not.toHaveBeenCalled();
  });

  test('Create administrator 201 Created', async () => {
    const connection = useConnection([
      noDuplicates(),
      {
        outBinds: {
          idWorker: [40],
        },
      },
      {
        rowsAffected: 1,
      },
      {
        rowsAffected: 1,
      },
    ]);

    const response = await request(app)
      .post('/management/users')
      .send(
        validUser({
          email: 'admin@cinepi.com',
          firstName: 'Laura',
          identificationNumber: '222333444',
          role: 'ADMINISTRATOR',
          locations: [1],
        })
      )
      .expect(201);

    expect(response.body.data).toEqual({
      id: 40,
      role: 'ADMINISTRATOR',
      email: 'admin@cinepi.com',
      firstName: 'Laura',
      firstSurname: 'Mora',
    });

    expect(connection.execute)
      .toHaveBeenCalledTimes(4);

    expect(connection.commit)
      .toHaveBeenCalledTimes(1);

    expect(mockSendTemporaryPasswordEmail)
      .toHaveBeenCalledWith({
        email: 'admin@cinepi.com',
        firstName: 'Laura',
        temporaryPassword: expect.any(String),
      });
  });

  test('Create administrator 400 when creator is administrator', async () => {
    currentUserRole = 'ADMINISTRATOR';

    const response = await request(app)
      .post('/management/users')
      .send(
        validUser({
          role: 'ADMINISTRATOR',
          locations: [1],
        })
      )
      .expect(400);

    expect(response.body.errors.role)
      .toBe(
        'No tienes permisos para registrar usuarios con este rol'
      );

    expect(mockGetConnection)
      .not.toHaveBeenCalled();
  });

  test('Create employee 201 when creator is administrator', async () => {
    currentUserRole = 'ADMINISTRATOR';

    const connection = useConnection([
      noDuplicates(),
      {
        outBinds: {
          idWorker: [50],
        },
      },
      {
        rowsAffected: 1,
      },
      {
        rowsAffected: 1,
      },
    ]);

    await request(app)
      .post('/management/users')
      .send(
        validUser({
          email: 'empleado-admin@cinepi.com',
          identificationNumber: '333444555',
          role: 'EMPLOYEE',
          locations: [2],
        })
      )
      .expect(201);

    expect(connection.commit)
      .toHaveBeenCalledTimes(1);
  });

  test('Create user 500 when database fails', async () => {
    const connection = createMockConnection();

    connection.execute
      .mockResolvedValueOnce(noDuplicates())
      .mockRejectedValueOnce(
        new Error('Oracle insert error')
      );

    mockGetConnection.mockResolvedValue(
      connection
    );

    const response = await request(app)
      .post('/management/users')
      .send(validUser())
      .expect(500);

    expect(response.body).toEqual({
      message:
        'No fue posible completar la operación.',
    });

    expect(connection.rollback)
      .toHaveBeenCalledTimes(1);

    expect(connection.commit)
      .not.toHaveBeenCalled();

    expect(mockSendTemporaryPasswordEmail)
      .not.toHaveBeenCalled();

    expect(mockCloseDatabaseConnection)
      .toHaveBeenCalledTimes(1);
  });
});