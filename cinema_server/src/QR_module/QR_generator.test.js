import { expect } from '@jest/globals';
import request from 'supertest';

describe('GET /seats/:screeningId/:seatId/qr', () => {
    test('200 OK returns a QR data URL', async () => {
        const connection = useConnection([
            { rows: [{ SEAT: 'C5', SCREEN: 2, SCREENING_DATE: '2026-12-01', SCREENING_START_TIME: '18:30' }] },
        ]);

        const response = await request(app).get('/seats/7/12/qr').expect(200);

        expect(response.body.qrCode).toMatch(/^data:image\/png;base64,/);
        expect(connection.execute.mock.calls[0][1]).toEqual({ screeningId: 7, seatId: 12 });
        expect(mockCloseDatabaseConnection).toHaveBeenCalledTimes(1);
    });

    test('404 when there is no data', async () => {
        useConnection([{ rows: [] }]);

        await request(app).get('/seats/7/999/qr').expect(404);
    });
});