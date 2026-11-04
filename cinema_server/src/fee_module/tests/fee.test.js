import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

import feeRoutes from '../routes/fee_routes.js';
import { ROLES, SESSION_COOKIE_NAME, createSessionToken } from '../../session/session.js';

process.env.JWT_SECRET = 'test-secret';

const SESSION_VERSION = 0;

const MOCK_FEES = [
  { ID_FEE: 1, TYPE: 'G', AMOUNT: 4500, ID_AUDIOVISUAL_FORMAT: 3, AUDIOVISUAL_FORMAT_NAME: 'DCP 2K + 5.1 Surround' },
  { ID_FEE: 2, TYPE: 'N', AMOUNT: 3500, ID_AUDIOVISUAL_FORMAT: 3, AUDIOVISUAL_FORMAT_NAME: 'DCP 2K + 5.1 Surround' }
];

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/management/fees', feeRoutes);
app.use((error, req, res, next) => {
  res.status(500).json({ message: error.message });
});
//first query reads the session version, the next ones belong to the controller
function sessionCookie(role) {
  const token = createSessionToken({ id: 1, role, sessionVersion: SESSION_VERSION });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function mockDatabase(...controllerResponses) {
  const execute = jest.fn().mockResolvedValueOnce({ rows: [[SESSION_VERSION]] });
  for (const response of controllerResponses) {
    if (response instanceof Error) {
      execute.mockRejectedValueOnce(response);
    } else {
      execute.mockResolvedValueOnce(response);
    }
  }
  const connection = { execute, close: jest.fn().mockResolvedValue() };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /management/fees', () => {
  test('Returns the active fees for an administrator', async () => {
    const connection = mockDatabase({ rows: MOCK_FEES });

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(MOCK_FEES);
    expect(connection.execute.mock.calls[1][0]).toMatch(/IS_DELETED = 0/);
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Returns the active fees for a superuser', async () => {
    mockDatabase({ rows: MOCK_FEES });

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.SUPERUSER))
      .expect(200);

    expect(response.body.data).toHaveLength(2);
  });

  test('Returns an empty list when there are no fees', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Rejects a request without a session with 401', async () => {
    await request(app).get('/management/fees').expect(401);
  });

  test('Rejects an employee with 403', async () => {
    const connection = mockDatabase();

    await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.EMPLOYEE))
      .expect(403);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Rejects a client with 403', async () => {
    mockDatabase();

    await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(403);
  });
});

describe('POST /management/fees', () => {
  const VALID_FEE = { type: 'G', formatId: 3, amount: '4500.50' };
  const FORMAT_ROW = { rows: [{ AUDIOVISUAL_FORMAT_NAME: 'IMAX 3D + Dolby Atmos' }] };

  function postFee(body, role = ROLES.ADMINISTRATOR) {
    return request(app)
      .post('/management/fees')
      .set('Cookie', sessionCookie(role))
      .send(body);
  }

  function mockInsert(connection, feeId = 25) {
    connection.execute.mockResolvedValueOnce({ outBinds: { feeId: [feeId] } });
    connection.commit = jest.fn().mockResolvedValue();
  }

  test('Creates a fee and returns 201', async () => {
    const connection = mockDatabase(FORMAT_ROW, { rows: [] });
    mockInsert(connection);

    const response = await postFee(VALID_FEE).expect(201);

    expect(response.body.data).toEqual({
      ID_FEE: 25,
      TYPE: 'G',
      AMOUNT: 4500.5,
      ID_AUDIOVISUAL_FORMAT: 3,
      AUDIOVISUAL_FORMAT_NAME: 'IMAX 3D + Dolby Atmos'
    });
    const [sql, binds] = connection.execute.mock.calls[3];
    expect(sql).toMatch(/INSERT INTO PI_DEVELOPERS\.FEES/);
    expect(binds).toMatchObject({ type: 'G', amount: 4500.5, formatId: 3 });
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('Returns 400 with "Campo obligatorio" for every empty field', async () => {
    const connection = mockDatabase();

    const response = await postFee({ type: '', formatId: '', amount: '' }).expect(400);

    expect(response.body.errors).toEqual({
      type: 'Campo obligatorio',
      formatId: 'Campo obligatorio',
      amount: 'Campo obligatorio'
    });
    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test.each(['0', '-100', 'abc'])('Returns 400 when the amount is %s', async (amount) => {
    mockDatabase();

    const response = await postFee({ ...VALID_FEE, amount }).expect(400);

    expect(response.body.errors.amount).toBe('El monto debe ser un número mayor que cero');
  });

  test('Returns 400 when the amount has more than 2 decimals', async () => {
    mockDatabase();

    const response = await postFee({ ...VALID_FEE, amount: '10.555' }).expect(400);

    expect(response.body.errors.amount).toBe('El monto puede tener como máximo 2 decimales');
  });

  test('Returns 400 when the type is not valid', async () => {
    mockDatabase();

    const response = await postFee({ ...VALID_FEE, type: 'X' }).expect(400);

    expect(response.body.errors.type).toBe('Seleccione un tipo de tarifa válido');
  });

  test('Returns 400 when the audiovisual format does not exist', async () => {
    mockDatabase({ rows: [] });

    const response = await postFee(VALID_FEE).expect(400);

    expect(response.body.errors.formatId).toBe('El formato audiovisual seleccionado no existe');
  });

  test('Returns 409 when an active fee with the same type and format exists', async () => {
    const connection = mockDatabase(FORMAT_ROW, { rows: [{ ID_FEE: 4 }] });

    const response = await postFee(VALID_FEE).expect(409);

    expect(response.body.message).toBe('Ya existe una tarifa General activa para IMAX 3D + Dolby Atmos');
    expect(connection.execute).toHaveBeenCalledTimes(3);
  });

  test('Returns 409 when the unique index rejects a concurrent duplicate', async () => {
    const uniqueError = Object.assign(new Error('ORA-00001: unique constraint violated'), { errorNum: 1 });
    mockDatabase(FORMAT_ROW, { rows: [] }, uniqueError);

    const response = await postFee(VALID_FEE).expect(409);

    expect(response.body.message).toBe('Ya existe una tarifa General activa para IMAX 3D + Dolby Atmos');
  });

  test('Returns 500 when the insert fails', async () => {
    const connection = mockDatabase(FORMAT_ROW, { rows: [] }, new Error('ORA-12345: insert failed'));
    const response = await postFee(VALID_FEE).expect(500);

    expect(response.body.message).toMatch(/ORA-12345/);
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Rejects an employee with 403', async () => {
    const connection = mockDatabase();

    await postFee(VALID_FEE, ROLES.EMPLOYEE).expect(403);
    expect(connection.execute).toHaveBeenCalledTimes(1);
  });
});

describe('PUT /management/fees/:id', () => {
  const UPDATED_FEE = { type: 'N', formatId: 3, amount: '3800' };
  const EXISTING_FEE = { rows: [{ ID_FEE: 7 }] };
  const FORMAT_ROW = { rows: [{ AUDIOVISUAL_FORMAT_NAME: 'IMAX 3D + Dolby Atmos' }] };

  function putFee(id, body, role = ROLES.ADMINISTRATOR) {
    return request(app)
      .put(`/management/fees/${id}`)
      .set('Cookie', sessionCookie(role))
      .send(body);
  }

  test('Updates a fee and returns 200', async () => {
    const connection = mockDatabase(EXISTING_FEE, FORMAT_ROW, { rows: [] }, { rowsAffected: 1 });
    connection.commit = jest.fn().mockResolvedValue();
    const response = await putFee(7, UPDATED_FEE).expect(200);

    expect(response.body.data).toEqual({
      ID_FEE: 7,
      TYPE: 'N',
      AMOUNT: 3800,
      ID_AUDIOVISUAL_FORMAT: 3,
      AUDIOVISUAL_FORMAT_NAME: 'IMAX 3D + Dolby Atmos'
    });
    const [duplicateSql, duplicateBinds] = connection.execute.mock.calls[3];
    expect(duplicateSql).toMatch(/ID_FEE <> :excludeFeeId/);
    expect(duplicateBinds).toEqual({ type: 'N', formatId: 3, excludeFeeId: 7 });
    const [updateSql, updateBinds] = connection.execute.mock.calls[4];
    expect(updateSql).toMatch(/UPDATE PI_DEVELOPERS\.FEES/);
    expect(updateBinds).toEqual({ type: 'N', amount: 3800, formatId: 3, feeId: 7 });
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('Returns 400 with "Campo obligatorio" for every empty field', async () => {
    const connection = mockDatabase();
    const response = await putFee(7, { type: '', formatId: '', amount: '' }).expect(400);

    expect(response.body.errors).toEqual({
      type: 'Campo obligatorio',
      formatId: 'Campo obligatorio',
      amount: 'Campo obligatorio'
    });
    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Returns 400 when the amount is not greater than zero', async () => {
    mockDatabase();
    const response = await putFee(7, { ...UPDATED_FEE, amount: '0' }).expect(400);

    expect(response.body.errors.amount).toBe('El monto debe ser un número mayor que cero');
  });

  test('Returns 404 when the fee does not exist or is deactivated', async () => {
    const connection = mockDatabase({ rows: [] });
    const response = await putFee(99, UPDATED_FEE).expect(404);

    expect(response.body.message).toBe('No se encontró la tarifa');
    expect(connection.execute).toHaveBeenCalledTimes(2);
  });

  test('Returns 404 for an invalid fee id', async () => {
    const connection = mockDatabase();
    await putFee('abc', UPDATED_FEE).expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Returns 409 when another active fee has the same type and format', async () => {
    const connection = mockDatabase(EXISTING_FEE, FORMAT_ROW, { rows: [{ ID_FEE: 8 }] });
    const response = await putFee(7, UPDATED_FEE).expect(409);

    expect(response.body.message).toBe('Ya existe una tarifa Niño activa para IMAX 3D + Dolby Atmos');
    expect(connection.execute).toHaveBeenCalledTimes(4);
  });

  test('Returns 409 when the unique index rejects a concurrent duplicate', async () => {
    const uniqueError = Object.assign(new Error('ORA-00001: unique constraint violated'), { errorNum: 1 });
    mockDatabase(EXISTING_FEE, FORMAT_ROW, { rows: [] }, uniqueError);
    const response = await putFee(7, UPDATED_FEE).expect(409);

    expect(response.body.message).toBe('Ya existe una tarifa Niño activa para IMAX 3D + Dolby Atmos');
  });

  test('Rejects an employee with 403', async () => {
    const connection = mockDatabase();
    await putFee(7, UPDATED_FEE, ROLES.EMPLOYEE).expect(403);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });
});

describe('PATCH /management/fees/:id/deactivate', () => {
  function deactivateFee(id, role = ROLES.ADMINISTRATOR) {
    return request(app)
      .patch(`/management/fees/${id}/deactivate`)
      .set('Cookie', sessionCookie(role));
  }

  test('Deactivates an active fee with a logical deletion', async () => {
    const connection = mockDatabase({ rowsAffected: 1 });
    connection.commit = jest.fn().mockResolvedValue();
    const response = await deactivateFee(7).expect(200);

    expect(response.body.message).toBe('Tarifa desactivada');
    const [sql, binds] = connection.execute.mock.calls[1];
    expect(sql).toMatch(/SET IS_DELETED = 1/);
    expect(sql).not.toMatch(/DELETE FROM/);
    expect(binds).toEqual({ feeId: 7 });
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('Returns 200 without changes when the fee was already deactivated', async () => {
    const connection = mockDatabase({ rowsAffected: 0 }, { rows: [{ ID_FEE: 7 }] });
    connection.commit = jest.fn();
    const response = await deactivateFee(7).expect(200);

    expect(response.body.message).toBe('La tarifa ya estaba desactivada');
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('Returns 404 when the fee does not exist', async () => {
    mockDatabase({ rowsAffected: 0 }, { rows: [] });
    const response = await deactivateFee(99).expect(404);

    expect(response.body.message).toBe('No se encontró la tarifa');
  });

  test('Returns 404 for an invalid fee id', async () => {
    const connection = mockDatabase();
    await deactivateFee('abc').expect(404);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Returns 500 when the update fails', async () => {
    const connection = mockDatabase(new Error('ORA-12345: update failed'));
    const response = await deactivateFee(7).expect(500);
    expect(response.body.message).toMatch(/ORA-12345/);
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Rejects an employee with 403', async () => {
    const connection = mockDatabase();
    await deactivateFee(7, ROLES.EMPLOYEE).expect(403);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });
});
