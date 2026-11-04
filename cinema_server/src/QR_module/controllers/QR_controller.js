import oracledb from 'oracledb';
import QRCode from 'qrcode';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';

async function getQRData(screeningId, seatId) {
    let connection;
    console.log(`Fetching QR data for screeningId: ${screeningId}, seatId: ${seatId}`);
    try {
        connection = await getConnection();
        console.log('Database connection established for QR data retrieval.');
        const request = `SELECT s.SEAT_ROW || s.SEAT_NUMBER AS SEAT,
                    scr.ID_SCREEN AS SCREEN,
                    TO_CHAR(sc.SCREENING_DATE, 'YYYY-MM-DD') AS SCREENING_DATE,
                    sc.SCREENING_START_TIME
                FROM PI_DEVELOPERS.SEATS s
                JOIN PI_DEVELOPERS.SCREENINGS sc ON s.ID_SCREENING = sc.ID_SCREENING
                JOIN PI_DEVELOPERS.SCREENS scr ON sc.ID_SCREEN = scr.ID_SCREEN
                WHERE s.ID_SCREENING = :screeningId
                AND s.ID_SEAT = :seatId`;

        const result = await connection.execute(
            request,
            {
                screeningId: Number(screeningId),
                seatId: Number(seatId),
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
        );


        return result.rows[0] ?? null;
    }catch (error) {
        console.error('Error retrieving QR data:', error);
        throw error;
    } 
    finally {
        if (connection) {
            await closeDatabaseConnection(connection);
        }
    }
}

export const QRGenerator = async (req, res, next) => {
    console.log('Received request for QR code generation:', req.params);
    try {
        const { screeningId, seatId } = req.params;
        const qrData = await getQRData(screeningId, seatId);

        if (!qrData) 
            {
            return res.status(404).json({
                message: 'No data found for the provided screeningId and seatId',
            });
        }

        const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));
        res.status(200).json(
            { 
                qrCode 
            }
        );
    } catch (error) {
        next(error);
    }
};