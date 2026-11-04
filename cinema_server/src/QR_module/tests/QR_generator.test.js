import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import emailService from '../../email/email_service.js';
import qrRoutes from '../routes/QR_routes.js';

const BASE_PATH = '/purchase';


const USER_ID = 1;
const USER_EMAIL = 'cliente@correo.com';

const SEAT_ROW_C5 = {
    SEAT: 'C5',
    SCREEN: 2,
    SCREENING_DATE: '2026-12-01',
    SCREENING_START_TIME: '18:30',
};
const SEAT_ROW_C6 = { ...SEAT_ROW_C5, SEAT: 'C6' };

const BODY = {
    data: [
        { screeningId: 7, seatId: 12 },
        { screeningId: 7, seatId: 13 },
    ],
};

function useDatabase({
    seatRows = { '7-12': SEAT_ROW_C5, '7-13': SEAT_ROW_C6 },
    emailRow = { EMAIL: USER_EMAIL },
    seatError = null,
    emailError = null,
} = {}) {
    const execute = jest.fn(async (sql, binds) => {
        if (/PI_DEVELOPERS\.CLIENTS/.test(sql)) {
            if (emailError) {
                throw emailError;
            }
            return { rows: emailRow ? [emailRow] : [] };
        }

        if (/PI_DEVELOPERS\.SEATS/.test(sql)) {
            if (seatError) {
                throw seatError;
            }
            const row = seatRows[`${binds.screeningId}-${binds.seatId}`];
            return { rows: row ? [row] : [] };
        }

        throw new Error(`SQL inesperado en el test: ${sql}`);
    });

    const close = jest.fn().mockResolvedValue();
    const connection = { execute, close, release: close };

    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
    return connection;
}


const app = express();
app.use(express.json());
app.use(BASE_PATH, qrRoutes);
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});

let sendEmail;

beforeEach(() => {
    sendEmail = jest
        .spyOn(emailService, 'sendQREmail')
        .mockResolvedValue({ messageId: 'test' });
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe(`POST ${BASE_PATH}/qr/:idUser`, () => {
    const post = (body = BODY, idUser = USER_ID) =>
        request(app).post(`${BASE_PATH}/qr/${idUser}`).send(body);

    test('200 OK generates the PDF and sends it by email', async () => {
        const connection = useDatabase();

        const response = await post()
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body).toEqual({ message: 'success' });

        expect(sendEmail).toHaveBeenCalledTimes(1);
        const [{ email, pdfBuffer }] = sendEmail.mock.calls[0];
        expect(email).toBe(USER_EMAIL);

        expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
        expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');

        const calls = connection.execute.mock.calls;
        const seatBinds = calls
            .filter(([sql]) => /PI_DEVELOPERS\.SEATS/.test(sql))
            .map(([, binds]) => binds);
        const emailBinds = calls
            .filter(([sql]) => /PI_DEVELOPERS\.CLIENTS/.test(sql))
            .map(([, binds]) => binds);

        expect(seatBinds).toEqual(
            expect.arrayContaining([
                { screeningId: 7, seatId: 12 },
                { screeningId: 7, seatId: 13 },
            ]),
        );
        expect(seatBinds).toHaveLength(2);
        expect(emailBinds).toEqual([{ id: USER_ID }]);
        expect(connection.close).toHaveBeenCalledTimes(3);
    });

    test('200 OK with a single seat', async () => {
        useDatabase();

        await post({ data: [{ screeningId: 7, seatId: 12 }] }).expect(200);

        expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    test('500 when a seat query fails, no email is sent and connections are closed', async () => {
        const connection = useDatabase({
            seatError: new Error('ORA-00942: table or view does not exist'),
        });

        const response = await post().expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(sendEmail).not.toHaveBeenCalled();
        expect(connection.close).toHaveBeenCalledTimes(2);
    });

    test('500 when the email lookup fails', async () => {
        useDatabase({ emailError: new Error('ORA-01031: insufficient privileges') });

        const response = await post().expect(500);

        expect(response.body.message).toMatch(/ORA-01031/);
        expect(sendEmail).not.toHaveBeenCalled();
    });

    test('500 when sending the email fails', async () => {
        useDatabase();
        sendEmail.mockRejectedValue(new Error('SMTP connection refused'));

        const response = await post().expect(500);

        expect(response.body.message).toMatch(/SMTP/);
    });

});