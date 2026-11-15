import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
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

function reservationCookie(reservationId = 5, screeningId = 7) {
    const token = createReservationToken({
        reservationId,
        screeningId
    });

    return `${RESERVATION_COOKIE_NAME}=${token}`;
}

function findCookie(response) {
    return (response.headers['set-cookie'] ?? []).find((cookie) => cookie.startsWith(`${RESERVATION_COOKIE_NAME}=`));
}

function findCall(connection, pattern) {
    return connection.execute.mock.calls.find(([sql]) => pattern.test(sql));
}

const ACTIVE_RESERVATION = {
    ID_RESERVATION: 5,
    RESERVED_UNTIL: RESERVED_UNTIL
};

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/seats', seatsRoutes);
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe('GET /seats/:screeningId', () => {
    test('200 OK: sin compras ni reservas, todos disponibles', async () => {
        const connection = useDatabase();
    test('200 OK: sin compras ni reservas, todos disponibles', async () => {
        const connection = useDatabase();

        const response = await request(app)
            .get('/seats/7')
            .expect('Content-type', /json/)
            .expect(200);
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
        const response = await request(app).get('/seats/999').expect(200);

        expect(response.body.data).toEqual([]);
    });
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
        const response = await request(app).get('/seats/7').expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});

describe('DELETE /seats/:screeningId/reservation/:seatId', () => {
    test('quita el asiento de la reserva sin reiniciar el tiempo', async () => {
        const connection = useDatabase({ ownReservation: ACTIVE_RESERVATION });

        const response = await request(app)
            .delete('/seats/7/reservation/10')
            .set('Cookie', reservationCookie())
            .expect(200);

        const [, deleteBinds] = findCall(connection, /DELETE FROM PI_DEVELOPERS\.RESERVATIONS_SEATS/);

        expect(deleteBinds).toEqual({
            reservationId: 5,
            screeningId: '7',
            seatId: '10'
        });
        expect(findCall(connection, /UPDATE PI_DEVELOPERS\.RESERVATIONS\s+SET RESERVED_UNTIL = SYSTIMESTAMP \+/)).toBeUndefined();
        expect(connection.commit).toHaveBeenCalledTimes(1);
        expect(response.body.data.reservedUntil).toBe(RESERVED_UNTIL.toISOString());
        expect(findCookie(response)).toMatch(/HttpOnly/);
    });

    test('410 sin cookie de reserva', async () => {
        useDatabase();

        const response = await request(app)
            .delete('/seats/7/reservation/10')
            .expect(410);

        expect(response.body.code).toBe('RESERVATION_EXPIRED');
    });

    test('410 y borra la cookie cuando la reserva expiró', async () => {
        useDatabase();

        const response = await request(app)
            .delete('/seats/7/reservation/10')
            .set('Cookie', reservationCookie())
            .expect(410);

        expect(findCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });
});

describe('DELETE /seats/:screeningId/reservation', () => {
    test('expira la reserva al instante y borra la cookie', async () => {
        const connection = useDatabase();

        const response = await request(app)
            .delete('/seats/7/reservation')
            .set('Cookie', reservationCookie())
            .expect(200);

        const [, binds] = findCall(connection, /SET RESERVED_UNTIL = SYSTIMESTAMP\s+WHERE/);

        expect(binds).toEqual([5]);
        expect(connection.commit).toHaveBeenCalledTimes(1);
        expect(findCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    test('sin cookie no toca la base de datos', async () => {
        jest.spyOn(oracledb, 'getConnection');

        await request(app)
            .delete('/seats/7/reservation')
            .expect(200);

        expect(oracledb.getConnection).not.toHaveBeenCalled();
    });
});

describe('Only guests and clients can reserve seats', () => {
    function sessionCookie(role) {
        const token = createSessionToken({
            id: 3,
            role,
            sessionVersion: 0
        });

        return `${SESSION_COOKIE_NAME}=${token}`;
    }

    test.each([
        ROLES.EMPLOYEE,
        ROLES.ADMINISTRATOR,
        ROLES.SUPERUSER
    ])('403 for %s when reserving or releasing', async (role) => {
        const connection = useDatabase();

        await request(app)
            .post('/seats/7/reservation/10')
            .set('Cookie', sessionCookie(role))
            .expect(403);

        await request(app)
            .delete('/seats/7/reservation/10')
            .set('Cookie', sessionCookie(role))
            .expect(403);

        expect(connection.execute).not.toHaveBeenCalled();
    });

    test('a client can reserve', async () => {
        useDatabase();

        await request(app)
            .post('/seats/7/reservation/10')
            .set('Cookie', sessionCookie(ROLES.CLIENT))
            .expect(200);
    });
});

