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
        ? 'No fue posible cargar la información de los usuarios.'
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

//Role filter
  test('applies role filter', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/users?role=EMPLOYEE')
      .expect(200);

    const [, binds] = mockConnection.execute.mock.calls[0];

    expect(binds).toHaveProperty('role', 'EMPLOYEE');
  });

//Role invalit
  test('returns 400 when role filter is invalid', async () => {
    const response = await request(app)
      .get('/management/users?role=PIRATE')
      .expect(400);

    expect(response.body).toEqual({
      message: 'Invalid role filter',
    });

    expect(mockGetConnection).not.toHaveBeenCalled();
  });

//Status filter (ACTIVE INACTIVE)
  test('applies status filter', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/users?status=INACTIVE')
      .expect(200);

    const [, binds] = mockConnection.execute.mock.calls[0];

    expect(binds).toHaveProperty('status', 'INACTIVE');
  });

//Status invalit
  test('returns 400 when status filter is invalid', async () => {
    const response = await request(app)
      .get('/management/users?status=DELETED')
      .expect(400);

    expect(response.body).toEqual({
      message: 'Invalid status filter',
    });

    expect(mockGetConnection).not.toHaveBeenCalled();
  });

//Search by name
  test('applies name search', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/users?name=Stephannie')
      .expect(200);

    const [, binds] = mockConnection.execute.mock.calls[0];

    expect(binds).toHaveProperty('name', '%stephannie%');
  });

//Location filter
  test('applies location filter', async () => {
    const mockConnection = {
      execute: jest.fn().mockResolvedValue({ rows: [] }),
    };

    mockGetConnection.mockResolvedValue(mockConnection);
    mockCloseDatabaseConnection.mockResolvedValue();

    await request(app)
      .get('/management/users?locationId=3')
      .expect(200);

    const [, binds] = mockConnection.execute.mock.calls[0];

    expect(binds).toHaveProperty('locationId', 3);
  });

//Location invalit
  test('returns 400 when location filter is invalid', async () => {
    const response = await request(app)
      .get('/management/users?locationId=abc')
      .expect(400);

    expect(response.body).toEqual({
      message: 'Invalid location filter',
    });

    expect(mockGetConnection).not.toHaveBeenCalled();
  });

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
      message: 'No fue posible cargar la información de los usuarios.',
    });

    expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
  });
});