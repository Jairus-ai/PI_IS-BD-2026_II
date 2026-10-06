import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';

import clientRoutes from '../routes/client_routes.js';
import { isAdult } from '../validators/client_validator.js';
import emailService from '../../email/email_service.js';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/clients', clientRoutes);

const REGISTER_URL = '/clients/register';

const validClient = {
  email: 'Adrian.prueba@ucr.ac.cr',
  password: 'Cine!Luna#Roja77',
  firstName: 'Adrián',
  middleName: '',
  firstSurname: 'Arias',
  lastSurname: 'Vargas',
  identificationType: 'C',
  identificationNumber: '1-2345-6789',
  birthdate: '2000-05-10',
  phoneNumber: '8888-8888'
};

function mockDatabaseConnection(executeImplementation) {
  const connection = {
    execute: jest.fn(executeImplementation),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
  };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

function uniqueConstraintError(constraintName) {
  const error = new Error(`ORA-00001: unique constraint (PI_DEVELOPERS.${constraintName}) violated`);
  error.errorNum = 1;
  return error;
}

let sendWelcomeEmailSpy;
beforeEach(() => {
  sendWelcomeEmailSpy = jest.spyOn(emailService, 'sendWelcomeEmail').mockResolvedValue();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /clients/register', () => {
  test('Register client 201 Created', async () => {
    const connection = mockDatabaseConnection(async () => ({ outBinds: { idClient: [7] } }));

    const response = await request(app)
      .post(REGISTER_URL)
      .send(validClient)
      .expect('Content-type', /json/)
      .expect(201);

    expect(response.body.data).toEqual({
      id: 7,
      role: 'CLIENT',
      email: 'adrian.prueba@ucr.ac.cr',
      firstName: 'Adrián',
      firstSurname: 'Arias'
    });

    const clientBinds = connection.execute.mock.calls[0][1];
    expect(clientBinds.email).toBe('adrian.prueba@ucr.ac.cr');
    expect(clientBinds.identificationNumber).toBe('123456789');
    expect(clientBinds.phoneNumber).toBe('88888888');

    const credentialBinds = connection.execute.mock.calls[1][1];
    expect(credentialBinds.idClient).toBe(7);
    expect(credentialBinds.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(credentialBinds.passwordHash).not.toContain(validClient.password);

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);

    expect(sendWelcomeEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'adrian.prueba@ucr.ac.cr', firstName: 'Adrián' })
    );

    const sessionCookie = response.headers['set-cookie'].join(';');
    expect(sessionCookie).toMatch(/session_token=/);
    expect(sessionCookie).toMatch(/HttpOnly/);
  });

  test('Register client 201 even if the welcome email fails', async () => {
    mockDatabaseConnection(async () => ({ outBinds: { idClient: [8] } }));
    sendWelcomeEmailSpy.mockRejectedValue(new Error('SMTP error'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await request(app)
      .post(REGISTER_URL)
      .send(validClient)
      .expect(201);
  });

  test('Register client 400 when required fields are empty', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    const response = await request(app)
      .post(REGISTER_URL)
      .send({})
      .expect(400);

    expect(response.body.errors).toEqual({
      email: 'Campo obligatorio',
      password: 'Campo obligatorio',
      firstName: 'Campo obligatorio',
      firstSurname: 'Campo obligatorio',
      identificationType: 'Campo obligatorio',
      identificationNumber: 'Campo obligatorio',
      birthdate: 'Campo obligatorio',
      phoneNumber: 'Campo obligatorio'
    });
    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('Register client 400 when email format is invalid', async () => {
    const response = await request(app)
      .post(REGISTER_URL)
      .send({ ...validClient, email: 'adrian@correo' })
      .expect(400);

    expect(response.body.errors.email).toBe('El correo electrónico no tiene un formato válido');
  });

  test('Register client 400 when password is weak', async () => {
    const response = await request(app)
      .post(REGISTER_URL)
      .send({ ...validClient, password: 'password' })
      .expect(400);

    expect(response.body.errors.password).toBe('La contraseña es débil');
    expect(response.body.passwordSuggestions.length).toBeGreaterThan(0);
  });

  test('Register client 400 when client is under 18', async () => {
    const today = new Date();
    const underageBirthdate = `${today.getFullYear() - 17}-01-01`;

    const response = await request(app)
      .post(REGISTER_URL)
      .send({ ...validClient, birthdate: underageBirthdate })
      .expect(400);

    expect(response.body.errors.birthdate).toBe('Debes ser mayor de edad para registrarte');
  });

  test('Register client 409 when email already exists', async () => {
    const connection = mockDatabaseConnection(async () => {
      throw uniqueConstraintError('UQ_CLIENT_EMAIL');
    });

    const response = await request(app)
      .post(REGISTER_URL)
      .send(validClient)
      .expect(409);

    expect(response.body.errors.email).toBe('Ya existe un usuario con ese correo');
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('Register client 409 when identification already exists', async () => {
    mockDatabaseConnection(async () => {
      throw uniqueConstraintError('UQ_CLIENT_IDENTIFICATION');
    });

    const response = await request(app)
      .post(REGISTER_URL)
      .send(validClient)
      .expect(409);

    expect(response.body.errors.identificationNumber)
      .toBe('Ya existe un usuario con esa identificación');
  });

  test('Register client 500 when the database fails', async () => {
    const connection = mockDatabaseConnection(async () => {
      throw new Error('Oracle error');
    });

    await request(app)
      .post(REGISTER_URL)
      .send(validClient)
      .expect(500);

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

describe('isAdult', () => {
  test('Turns 18 exactly today', () => {
    expect(isAdult('2008-09-30', new Date(2026, 8, 30))).toBe(true);
  });

  test('Turns 18 tomorrow', () => {
    expect(isAdult('2008-10-01', new Date(2026, 8, 30))).toBe(false);
  });
});
