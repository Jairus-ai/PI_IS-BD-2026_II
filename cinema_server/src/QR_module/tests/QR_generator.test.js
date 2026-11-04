import { expect, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import oracledb from 'oracledb';
import qrRoutes from '../routes/QR_routes.js';

const BASE_PATH = '/purchase';


function createMockConnection(responses = []) {
    const execute = jest.fn();
    for (const response of responses) {
        if (response instanceof Error) {
            execute.mockRejectedValueOnce(response);
        } else {
            execute.mockResolvedValueOnce(response);
        }
    }

    const close = jest.fn().mockResolvedValue();
    return { execute, close, release: close };
}

function useConnection(responses) {
    const connection = createMockConnection(responses);
    jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
    return connection;
}


const app = express();
app.use(express.json());
app.use(BASE_PATH, qrRoutes);
app.use((err, req, res, next) => {
    res.status(500).json({ message: err.message });
});

beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});


describe(`GET ${BASE_PATH}/:screeningId/:seatId/qr`, () => {
    const MOCK_QR_DATA = {
        SEAT: 'C5',
        SCREEN: 2,
        SCREENING_DATE: '2026-12-01',
        SCREENING_START_TIME: '18:30',
    };

    const get = (screeningId = 7, seatId = 12) =>
        request(app).get(`${BASE_PATH}/${screeningId}/${seatId}/qr`);

    test('200 OK returns the QR as a data URL in JSON', async () => {
        const connection = useConnection([{ rows: [MOCK_QR_DATA] }]);

        const response = await get()
            .expect('Content-type', /json/)
            .expect(200);

        expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);

        const [sql, binds, options] = connection.execute.mock.calls[0];
        expect(sql).toMatch(/FROM PI_DEVELOPERS\.SEATS/);
        expect(sql).toMatch(/JOIN PI_DEVELOPERS\.SCREENINGS/);
        expect(sql).toMatch(/JOIN PI_DEVELOPERS\.SCREENS/);
        expect(sql).not.toMatch(/;\s*$/);
        expect(binds).toEqual({ screeningId: 7, seatId: 12 });
        expect(options).toEqual({ outFormat: oracledb.OUT_FORMAT_OBJECT });

        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('200 OK generates a different QR for different seat data', async () => {
        useConnection([{ rows: [MOCK_QR_DATA] }]);
        const first = await get().expect(200);

        useConnection([{ rows: [{ ...MOCK_QR_DATA, SEAT: 'D7' }] }]);
        const second = await get().expect(200);

        expect(second.body.qrCode).not.toEqual(first.body.qrCode);
    });

    test('404 when there is no data for that screening and seat', async () => {
        const connection = useConnection([{ rows: [] }]);

        const response = await get(7, 999)
            .expect('Content-type', /json/)
            .expect(404);

        expect(response.body).toHaveProperty('message');
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the query fails, and the connection is still closed', async () => {
        const connection = useConnection([
            new Error('ORA-00942: table or view does not exist'),
        ]);

        const response = await get().expect(500);

        expect(response.body.message).toMatch(/ORA-00942/);
        expect(connection.close).toHaveBeenCalledTimes(1);
    });

    test('500 when the connection cannot be opened', async () => {
        jest.spyOn(oracledb, 'getConnection').mockRejectedValue(
            new Error('NJS-503: connection refused'),
        );

        const response = await get().expect(500);

        expect(response.body.message).toMatch(/NJS-503/);
    });
});