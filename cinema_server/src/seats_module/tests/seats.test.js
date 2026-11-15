import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';
import seatsRoutes from '../routes/seats_routes.js';
import {
    RESERVATION_COOKIE_NAME,
    createReservationToken
} from '../services/reservation_cookie.js';

process.env.JWT_SECRET = 'test-secret';

const MOCK_SEATS = [
    {
        SEAT_ROW: '3',
        SEAT_NUMBER: 5,
        ID_SEAT: 10
    },
    {
        SEAT_ROW: '3',
        SEAT_NUMBER: 6,
        ID_SEAT: 11
    }
];

const RESERVED_UNTIL = new Date('2026-11-15T20:15:00.000Z');
const NEW_RESERVATION_ID = 99;

function useDatabase({
    seats = MOCK_SEATS,
    boughts = [],
    reservations = [],
    ownReservation = null,
    ownSeats = [],
    lockedSeat = { ID_SCREEN: 4 },
    taken = 0,
    errors = {}
} = {}) {
    const execute = jest.fn(async (sql) => {
        if (/FROM DUAL/.test(sql))
            return { rows: [{ TAKEN: taken }] };

        if (/INSERT INTO PI_DEVELOPERS\.RESERVATIONS \(/.test(sql))
            return { outBinds: { reservationId: [NEW_RESERVATION_ID] } };

        if (/RETURNING RESERVED_UNTIL/.test(sql))
            return { outBinds: { reservedUntil: [RESERVED_UNTIL] } };

        if (/INSERT INTO|DELETE FROM|SET RESERVED_UNTIL = SYSTIMESTAMP\s+WHERE/.test(sql)) {
            if (errors.write)
                throw errors.write;

            return { rowsAffected: 1 };
        }

        if (/FROM PI_DEVELOPERS\.RESERVATIONS\s+WHERE/.test(sql))
            return { rows: ownReservation ? [ownReservation] : [] };

        if (/FROM PI_DEVELOPERS\.RESERVATIONS_SEATS\s+WHERE ID_RESERVATION/.test(sql))
            return { rows: ownSeats.map((ID_SEAT) => ({ ID_SEAT })) };

        if (/SEAT_RECEIPTS/.test(sql)) {
            if (errors.boughts)
                throw errors.boughts;

            return { rows: boughts };
        }

        if (/JOIN PI_DEVELOPERS\.RESERVATIONS/.test(sql)) {
            if (errors.reservations)
                throw errors.reservations;

            return { rows: reservations };
        }

        if (/FOR UPDATE/.test(sql))
            return { rows: lockedSeat ? [lockedSeat] : [] };

        if (/PI_DEVELOPERS\.SEATS\b/.test(sql)) {
            if (errors.seats)
                throw errors.seats;

            return { rows: seats.map((seat) => ({ ...seat })) };
        }

        throw new Error(`SQL inesperado en el test: ${sql}`);
    });

    const close = jest.fn().mockResolvedValue();
    const commit = jest.fn().mockResolvedValue();
    const connection = {
        execute,
        close,
        commit
    };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);

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
app.use(cookieParser());
app.use('/seats', seatsRoutes);
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
    res.status(500).json({ message: err.message });
});

afterEach(() => {
    jest.restoreAllMocks();
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
            {
                SEAT_ROW: '3',
                SEAT_NUMBER: 5,
                ID_SEAT: 10,
                SEAT_AVAILABLE: 1
            },
            {
                SEAT_ROW: '3',
                SEAT_NUMBER: 6,
                ID_SEAT: 11,
                SEAT_AVAILABLE: 1
            }
        ]);
        expect(response.body.reservation).toBeNull();

        const calls = connection.execute.mock.calls;

        expect(calls).toHaveLength(3);

        for (const [, binds] of calls)
            expect(binds).toEqual(['7']);
    });

    test('una sola conexión para las consultas, y se cierra una vez', async () => {
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

    test('las reservas solo cuentan si están vigentes', async () => {
        const connection = useDatabase();

        await request(app).get('/seats/7').expect(200);

        const [sql] = findCall(connection, /JOIN PI_DEVELOPERS\.RESERVATIONS/);

        expect(sql).toMatch(/r\.RESERVED_UNTIL > SYSTIMESTAMP/);
        expect(sql).toMatch(/rs\.ID_SCREENING = :screeningId/);
    });

    test('un asiento comprado Y reservado sale una sola vez, no disponible', async () => {
        useDatabase({
            boughts: [{ ID_SEAT: 10 }],
            reservations: [{ ID_SEAT: 10 }]
        });

        const response = await request(app).get('/seats/7').expect(200);

        expect(response.body.data).toHaveLength(2);
        expect(response.body.data.find((s) => s.ID_SEAT === 10).SEAT_AVAILABLE).toBe(0);
    });

    test('devuelve la reserva propia cuando la cookie es válida', async () => {
        useDatabase({
            ownReservation: ACTIVE_RESERVATION,
            ownSeats: [10]
        });

        const response = await request(app)
            .get('/seats/7')
            .set('Cookie', reservationCookie())
            .expect(200);

        expect(response.body.reservation).toEqual({
            reservedUntil: RESERVED_UNTIL.toISOString(),
            seats: [10]
        });
    });

    test('borra la cookie cuando la reserva propia expiró', async () => {
        useDatabase();

        const response = await request(app)
            .get('/seats/7')
            .set('Cookie', reservationCookie())
            .expect(200);

        expect(response.body.reservation).toBeNull();
        expect(findCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    test('ignora una cookie de otra función sin borrarla', async () => {
        useDatabase();

        const response = await request(app)
            .get('/seats/7')
            .set('Cookie', reservationCookie(5, 8))
            .expect(200);

        expect(response.body.reservation).toBeNull();
        expect(findCookie(response)).toBeUndefined();
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
        [
            'asientos',
            'seats'
        ],
        [
            'compras',
            'boughts'
        ],
        [
            'reservas',
            'reservations'
        ]
    ])('500 cuando falla la consulta de %s, y la conexión se cierra', async (_label, key) => {
        const connection = useDatabase({
            errors: { [key]: new Error('ORA-00942: table or view does not exist') }
        });

        const response = await request(app).get('/seats/7').expect(500);
        const response = await request(app).get('/seats/7').expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});

describe('POST /seats/:screeningId/reservation/:seatId', () => {
    test('sin cookie crea una reserva nueva y guarda la cookie', async () => {
        const connection = useDatabase();

        const response = await request(app)
            .post('/seats/7/reservation/10')
            .expect(200);

        expect(response.body.data.reservedUntil).toBe(RESERVED_UNTIL.toISOString());
        expect(findCall(connection, /INSERT INTO PI_DEVELOPERS\.RESERVATIONS \(/)).toBeDefined();

        const [, binds] = findCall(connection, /INSERT INTO PI_DEVELOPERS\.RESERVATIONS_SEATS/);

        expect(binds).toEqual({
            seatId: '10',
            screenId: 4,
            screeningId: '7',
            reservationId: NEW_RESERVATION_ID
        });
        expect(connection.commit).toHaveBeenCalledTimes(1);
        expect(findCookie(response)).toMatch(/HttpOnly/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('con cookie válida agrega el asiento a la misma reserva y reinicia el tiempo', async () => {
        const connection = useDatabase({ ownReservation: ACTIVE_RESERVATION });

        await request(app)
            .post('/seats/7/reservation/11')
            .set('Cookie', reservationCookie())
            .expect(200);

        expect(findCall(connection, /INSERT INTO PI_DEVELOPERS\.RESERVATIONS \(/)).toBeUndefined();

        const [, insertBinds] = findCall(connection, /INSERT INTO PI_DEVELOPERS\.RESERVATIONS_SEATS/);
        const [, refreshBinds] = findCall(connection, /RETURNING RESERVED_UNTIL/);

        expect(insertBinds.reservationId).toBe(5);
        expect(refreshBinds.reservationId).toBe(5);
        expect(refreshBinds.minutes).toBe(15);
    });

    test('con cookie de otra función cancela la reserva anterior y crea otra', async () => {
        const connection = useDatabase();

        await request(app)
            .post('/seats/7/reservation/10')
            .set('Cookie', reservationCookie(5, 8))
            .expect(200);

        const [, cancelBinds] = findCall(connection, /SET RESERVED_UNTIL = SYSTIMESTAMP\s+WHERE/);

        expect(cancelBinds).toEqual([5]);
        expect(findCall(connection, /INSERT INTO PI_DEVELOPERS\.RESERVATIONS \(/)).toBeDefined();
    });

    test('410 y borra la cookie cuando la reserva expiró', async () => {
        const connection = useDatabase();

        const response = await request(app)
            .post('/seats/7/reservation/10')
            .set('Cookie', reservationCookie())
            .expect(410);

        expect(response.body.code).toBe('RESERVATION_EXPIRED');
        expect(findCookie(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
        expect(connection.commit).not.toHaveBeenCalled();
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('409 cuando el asiento ya está comprado o reservado', async () => {
        const connection = useDatabase({ taken: 1 });

        const response = await request(app)
            .post('/seats/7/reservation/10')
            .expect(409);

        expect(response.body.code).toBe('SEAT_UNAVAILABLE');
        expect(connection.commit).not.toHaveBeenCalled();
    });

    test('404 cuando el asiento no existe en la función', async () => {
        useDatabase({ lockedSeat: null });

        await request(app)
            .post('/seats/7/reservation/10')
            .expect(404);
    });

    test('500 cuando falla la escritura, sin commit y cerrando la conexión', async () => {
        const connection = useDatabase({ errors: { write: new Error('ORA-01031: insufficient privileges') } });

        const response = await request(app)
            .post('/seats/7/reservation/10')
            .set('Cookie', reservationCookie(5, 8))
            .expect(500);

        expect(response.body.message).toMatch(/ORA-01031/);
        expect(connection.commit).not.toHaveBeenCalled();
        expect(connection.close).toHaveBeenCalledTimes(1);
    });
});

describe('DELETE /seats/:screeningId/reservation/:seatId', () => {
    test('quita el asiento de la reserva y reinicia el tiempo', async () => {
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
        expect(findCall(connection, /RETURNING RESERVED_UNTIL/)).toBeDefined();
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
