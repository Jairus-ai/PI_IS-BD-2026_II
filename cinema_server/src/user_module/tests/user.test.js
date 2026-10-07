import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));

const { default: userRoutes } = await import('../routes/user_routes.js');

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /management/users', () => {

//Test empty list
  test('returns 200 and an empty list when there are no users', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/users')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ data: [] });
    expect(mockConnection.execute).toHaveBeenCalledTimes(1);
    expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
  });

// Test user list
  test('returns users when the database contains results', async () => {
    const mockUsers = [
      {
        USER_KEY: 'CLIENT-1',
        USER_ID: 1,
        ROLE: 'CLIENT',
        FIRST_NAME: 'Stephannie',
        MIDDLE_NAME: null,
        FIRST_SURNAME: 'Montanaro',
        LAST_SURNAME: 'Rojas',
        IDENTIFICATION_NUMBER: '123456789',
        EMAIL: 'steph@test.com',
        BIRTHDATE: '2000-01-01',
        PHONE_NUMBER: '88888888',
        STATUS: 'ACTIVE',
        LOCATIONS: null,
      },
    ];

    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: mockUsers }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/users')
      .expect(200);

    expect(response.body.data).toEqual(mockUsers);
    expect(response.body.data).toHaveLength(1);
  });

//Filters
test.each([
  ['role', 'EMPLOYEE', 'role', 'EMPLOYEE'],
  ['status', 'INACTIVE', 'status', 'INACTIVE'],
  ['name', 'Stephannie', 'name', '%stephannie%'],
  ['locationId', '3', 'locationId', 3],
])(
  'applies %s filter',
  async (queryParam, queryValue, bindName, expectedValue) => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get(`/management/users?${queryParam}=${queryValue}`)
      .expect(200);

    const [, binds] = mockConnection.execute.mock.calls[0];

    expect(binds).toHaveProperty(bindName, expectedValue);
  }
);

test.each([
  ['role', 'PIRATE', 'Invalid role filter'],
  ['status', 'DELETED', 'Invalid status filter'],
  ['locationId', 'abc', 'Invalid location filter'],
])(
  'returns 400 when %s filter is invalid',
  async (queryParam, queryValue, expectedMessage) => {
    const response = await request(app)
      .get(`/management/users?${queryParam}=${queryValue}`)
      .expect(400);

    expect(response.body).toEqual({
      message: expectedMessage,
    });

    expect(mockGetConnection).not.toHaveBeenCalled();
  }
);

//Multiple filters
  test('supports multiple filters at the same time', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/users?role=EMPLOYEE&status=ACTIVE&locationId=2&name=Juan')
      .expect(200);

    const [, binds] = mockConnection.execute.mock.calls[0];

    expect(binds).toEqual({
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      locationId: 2,
      name: '%juan%',
    });
  });

//Deactivates an activate workers
  test('deactivates an active worker successfully', async () => {
  const mockConnection = {
    execute: jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            ID_WORKER: 11,
            FIRST_NAME: 'Daniel',
            FIRST_SURNAME: 'Desactivar',
            ROLE: 'E',
            IS_ACTIVE: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        rowsAffected: 1,
      }),

    commit: jest.fn().mockResolvedValue(),
  };

  mockGetConnection.mockResolvedValue(mockConnection);
  mockCloseDatabaseConnection.mockResolvedValue();

  const response = await request(app)
    .patch('/management/users/11/deactivate')
    .expect(200);

  expect(response.body).toEqual({
    message: 'La cuenta fue desactivada correctamente.',
    data: {
      ID_WORKER: 11,
      STATUS: 'INACTIVE',
    },
  });

  expect(mockConnection.execute).toHaveBeenCalledTimes(2);
  expect(mockConnection.commit).toHaveBeenCalledTimes(1);
  expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
});

//Try deactivates an woker inactive
  test('returns 409 when worker is already inactive', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValueOnce({
        rows: [
          {
            ID_WORKER: 11,
            FIRST_NAME: 'Daniel',
            FIRST_SURNAME: 'Desactivar',
            ROLE: 'E',
            IS_ACTIVE: 0,
          },
        ],
      }),

      commit: jest.fn(),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .patch('/management/users/11/deactivate')
      .expect(409);

    expect(response.body).toEqual({
      message: 'La cuenta ya se encuentra inactiva.',
    });

    expect(mockConnection.execute).toHaveBeenCalledTimes(1);
    expect(mockConnection.commit).not.toHaveBeenCalled();
  });

//Try deactivate a worker does not exist.
  test('returns 404 when worker does not exist', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValueOnce({
        rows: [],
      }),

      commit: jest.fn(),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .patch('/management/users/99999/deactivate')
      .expect(404);

    expect(response.body).toEqual({
      message: 'Worker not found',
    });

    expect(mockConnection.commit).not.toHaveBeenCalled();
  });

// Deactivate wrong id
  test('returns 400 when worker ID is invalid', async () => {
    const response = await request(app)
      .patch('/management/users/abc/deactivate')
      .expect(400);

    expect(response.body).toEqual({
      message: 'Invalid worker ID',
    });

    expect(mockGetConnection).not.toHaveBeenCalled();
  });

//Uptate fail 
  test('returns 500 when deactivation fails', async () => {
    const mockConnection = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              ID_WORKER: 11,
              FIRST_NAME: 'Daniel',
              FIRST_SURNAME: 'Desactivar',
              ROLE: 'E',
              IS_ACTIVE: 1,
            },
          ],
        })
        .mockRejectedValueOnce(
          new Error('Oracle update error')
        ),

      commit: jest.fn(),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .patch('/management/users/11/deactivate')
      .expect(500);

    expect(response.body).toEqual({
      message: 'No fue posible completar la operación.',
    });

    expect(mockConnection.commit).not.toHaveBeenCalled();
    expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
  });

//Rigth id
  test('updates the selected worker ID', async () => {
    const mockConnection = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          rows: [
            {
              ID_WORKER: 25,
              FIRST_NAME: 'Ana',
              FIRST_SURNAME: 'Mora',
              ROLE: 'A',
              IS_ACTIVE: 1,
            },
          ],
        })
        .mockResolvedValueOnce({
          rowsAffected: 1,
        }),

      commit: jest.fn().mockResolvedValue(),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .patch('/management/users/25/deactivate')
      .expect(200);

    const [, updateBinds] =
      mockConnection.execute.mock.calls[1];

    expect(updateBinds).toEqual({
      workerId: 25,
    });
  });

//Oracle failure
  test('returns 500 when the database query fails', async () => {
    const mockConnection = {
      execute: jest.fn().mockRejectedValue(
        new Error('Oracle error')
      ),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    const response = await request(app)
      .get('/management/users')
      .expect(500);

    expect(response.body).toEqual({
      message: 'No fue posible completar la operación.',
    });

    expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
  });
});