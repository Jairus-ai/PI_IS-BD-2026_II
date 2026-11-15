import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import seatsRoutes from '../routes/seats_routes.js'; 

const mockGetConnection = jest.fn();
const mockCloseDatabaseConnection = jest.fn();

jest.unstable_mockModule('../../database/database.js', () => ({
  getConnection: mockGetConnection,
  closeDatabaseConnection: mockCloseDatabaseConnection,
}));


const MOCK_SEATS = [
    { SEAT_ROW: '3', SEAT_NUMBER: 5, ID_SEAT: 10 },
    { SEAT_ROW: '3', SEAT_NUMBER: 6, ID_SEAT: 11 },
];

function useDatabase({ seats = MOCK_SEATS, boughts = [], reservations = [], errors = {} } = {}) {
    const execute = jest.fn(async (sql) => {
        if (/SEAT_RECEIPTS/.test(sql)) {
            if (errors.boughts) throw errors.boughts;
            return { rows: boughts };
        }
        if (/\bRESERVATIONS\b/.test(sql)) {
            if (errors.reservations) throw errors.reservations;
            return { rows: reservations };
        }
        if (/PI_DEVELOPERS\.SEATS\b/.test(sql)) {
            if (errors.seats) throw errors.seats;
            return { rows: seats.map((seat) => ({ ...seat })) };
        }
        throw new Error(`SQL inesperado en el test: ${sql}`);
    });

    const close = jest.fn().mockResolvedValue();
    const connection = { execute, close, release: close };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
    return connection;
}

function createMockConnection(responses = []) {
  const execute = jest.fn();
  for (const response of responses) {
    if (response instanceof Error) {
      execute.mockRejectedValueOnce(response);
    } else {
      execute.mockResolvedValueOnce(response);
    }
  }
  return { execute };
}

function useConnection(responses) {
  const connection = createMockConnection(responses);
  mockGetConnection.mockResolvedValue(connection);
  return connection;
}


const app = express();
app.use(express.json());
app.use('/seats', seatsRoutes);
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

beforeEach(() => {
  mockGetConnection.mockReset();
  mockCloseDatabaseConnection.mockReset().mockResolvedValue();
});


describe('GET /seats/:screeningId', () => {
    test('200 OK: sin compras ni reservas, todos disponibles', async () => {
        const connection = useDatabase();

        const response = await request(app)
            .get('/seats/7')
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body.data).toEqual([
            { SEAT_ROW: '3', SEAT_NUMBER: 5, ID_SEAT: 10, SEAT_AVAILABLE: 1 },
            { SEAT_ROW: '3', SEAT_NUMBER: 6, ID_SEAT: 11, SEAT_AVAILABLE: 1 },
        ]);

        const calls = connection.execute.mock.calls;
        expect(calls).toHaveLength(3);
        for (const [, binds] of calls) {
            expect(binds).toEqual(['7']);
        }
    });

    test('una sola conexión para las tres consultas, y se cierra una vez', async () => {
        const connection = useDatabase();

        await request(app).get('/seats/7').expect(200);

        expect(oracledb.getConnection).toHaveBeenCalledTimes(1);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('un asiento comprado sale como no disponible', async () => {
        useDatabase({ boughts: [{ ID_SEAT: 11 }] });

        const response = await request(app).get('/seats/7').expect(200);

        const byId = Object.fromEntries(response.body.data.map((s) => [s.ID_SEAT, s]));
        expect(byId[11].SEAT_AVAILABLE).toBe(0);
        expect(byId[10].SEAT_AVAILABLE).toBe(1);
    });

    test('un asiento reservado sale como no disponible', async () => {
        useDatabase({ reservations: [{ ID_SEAT: 10 }] });

        const response = await request(app).get('/seats/7').expect(200);

        const byId = Object.fromEntries(response.body.data.map((s) => [s.ID_SEAT, s]));
        expect(byId[10].SEAT_AVAILABLE).toBe(0);
        expect(byId[11].SEAT_AVAILABLE).toBe(1);
    });

    test('un asiento comprado Y reservado sale una sola vez, no disponible', async () => {
        useDatabase({ boughts: [{ ID_SEAT: 10 }], reservations: [{ ID_SEAT: 10 }] });

        const response = await request(app).get('/seats/7').expect(200);

        expect(response.body.data).toHaveLength(2);
        expect(response.body.data.find((s) => s.ID_SEAT === 10).SEAT_AVAILABLE).toBe(0);
    });


    test('200 OK con lista vacía cuando la función no tiene asientos', async () => {
        useDatabase({ seats: [] });

        const response = await request(app).get('/seats/999').expect(200);

        expect(response.body.data).toEqual([]);
    });

    test.each([
        ['asientos', 'seats'],
        ['compras', 'boughts'],
        ['reservas', 'reservations'],
    ])('500 cuando falla la consulta de %s, y la conexión se cierra', async (_label, key) => {
        const connection = useDatabase({
            errors: { [key]: new Error('ORA-00942: table or view does not exist') },
        });

        const response = await request(app).get('/seats/7').expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});

describe.each([
  ['unavailable', 0, 'Seat marked as unavailable'],
  ['available', 1, 'Seat marked as available'],
])('PUT /seats/:screeningId/:seatId/%s', (action, value, message) => {
  const put = () => request(app).put(`/seats/7/12/${action}`);

  test('200 OK updates the seat', async () => {
    const connection = useConnection([{ rowsAffected: 1 }]);

    const response = await put()
      .expect('Content-type', /json/)
      .expect(200);

    expect(response.body).toEqual({ message });

    const [sql, binds, options] = connection.execute.mock.calls[0];
    expect(sql).toMatch(/UPDATE PI_DEVELOPERS\.SEATS/);
    expect(sql).toMatch(new RegExp(String.raw`SEAT_AVAILABLE\s*=\s*${value}`));
    expect(sql).toMatch(/ID_SCREENING = :screeningId/);
    expect(sql).toMatch(/ID_SEAT = :seatId/);
    expect(binds).toEqual(['7', '12']);
    expect(options).toEqual({ autoCommit: true });

    expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(connection);
  });

  test('500 when the update fails, and the connection is still closed', async () => {
    const connection = useConnection([
      new Error('ORA-01031: insufficient privileges'),
    ]);

    const response = await put().expect(500);

    expect(response.body.message).toMatch(/ORA-01031/);
    expect(mockCloseDatabaseConnection).toHaveBeenCalledWith(connection);
  });
});