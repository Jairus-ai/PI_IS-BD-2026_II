import oracledb from 'oracledb';
import QRCode from 'qrcode';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import PDFDocument from 'pdfkit';
import emailService from '../../email/email_service.js';

async function getQRData(screeningId, seatId) {
    let connection;
    try {
        connection = await getConnection();
        const request =
            `SELECT sr.ID_SEAT_RECEIPT AS TICKET,
                s.SEAT_ROW || s.SEAT_NUMBER AS SEAT,
                scr.ID_SCREEN AS SCREEN,
                TO_CHAR(sc.SCREENING_DATE, 'YYYY-MM-DD') AS SCREENING_DATE,
                sc.SCREENING_START_TIME
            FROM PI_DEVELOPERS.SEATS s
                JOIN PI_DEVELOPERS.SCREENINGS sc ON s.ID_SCREENING = sc.ID_SCREENING
                JOIN PI_DEVELOPERS.SCREENS scr ON sc.ID_SCREEN = scr.ID_SCREEN
                LEFT JOIN PI_DEVELOPERS.SEAT_RECEIPTS sr
                    ON sr.ID_SEAT = s.ID_SEAT
                    AND sr.ID_SCREEN = s.ID_SCREEN
                    AND sr.ID_SCREENING = s.ID_SCREENING
                    AND NOT EXISTS (
                        SELECT 1
                        FROM PI_DEVELOPERS.REFUNDS rf
                        WHERE rf.ID_RECEIPT = sr.ID_RECEIPT)
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

    } finally {
        if (connection) {
            await closeDatabaseConnection(connection);
        }
    }
};

async function QRGenerator(screeningId, seatId)
{
    const qrData = await getQRData(screeningId, seatId);

    if (!qrData) return null;

    return {
        qrCode: await QRCode.toDataURL(JSON.stringify(qrData)),
        seat: qrData.SEAT,
        screen: qrData.SCREEN,
        date: qrData.SCREENING_DATE,
        time: qrData.SCREENING_START_TIME,
    };
};


/**
 * @param {Array<{qrCode: string, seat: string, screen: number, date: string, time: string }>} tickets
 * @returns {Promise<Buffer>}
 */
function buildTicketsPdf(tickets) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const QR_SIZE = 250;

        tickets.forEach((ticket, index) => {
            if (index > 0) {
                doc.addPage();
            }

            doc.fontSize(22).text('CinePI', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(14).text(`Entrada ${index + 1} de ${tickets.length}`, { align: 'center' });
            doc.moveDown(1.5);

            doc.image(ticket.qrCode, (doc.page.width - QR_SIZE) / 2, doc.y, {
                width: QR_SIZE,
                height: QR_SIZE,
            });

            doc.y += QR_SIZE + 20;

            doc.fontSize(16).text(`Asiento: ${ticket.seat}`, { align: 'center' });
            doc.fontSize(12)
                .text(`Sala: ${ticket.screen}`, { align: 'center' })
                .text(`Fecha: ${ticket.date}   Hora: ${ticket.time}`, { align: 'center' });
        });

        doc.end();
    });
}

async function getUserEmail(userID) {
    let connection;
    try {
        connection = await getConnection();
        const request =
            `SELECT EMAIL
            FROM PI_DEVELOPERS.CLIENTS
            WHERE ID_CLIENT = :id`;

        const result = await connection.execute(
            request,
            {
                id: Number(userID),
            },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
        );

        return result.rows[0]?.EMAIL ?? null;

    } finally {
        if (connection) {
            await closeDatabaseConnection(connection);
        }
    }
};

async function getPurchaseEmailData(receiptId) {
    let connection;

    try {
        connection = await getConnection();

        const request =
            `SELECT r.ID_RECEIPT,
                r.TOTAL_AMOUNT,
                TO_CHAR(r.RECEIPT_DATE, 'DD/MM/YYYY HH24:MI') AS RECEIPT_DATE,
                l.LOCATION_NAME,
                m.MOVIE_TITLE,
                sc.ID_SCREEN AS SCREEN,
                TO_CHAR(sc.SCREENING_DATE, 'DD/MM/YYYY') AS SCREENING_DATE,
                TO_CHAR(sc.SCREENING_DATE + sc.SCREENING_START_TIME, 'HH24:MI') AS SCREENING_TIME
            FROM PI_DEVELOPERS.RECEIPTS r
                JOIN PI_DEVELOPERS.SEAT_RECEIPTS sr ON sr.ID_RECEIPT = r.ID_RECEIPT
                JOIN PI_DEVELOPERS.SCREENINGS sc ON sc.ID_SCREENING = sr.ID_SCREENING
                JOIN PI_DEVELOPERS.SCREENS scr ON scr.ID_SCREEN = sc.ID_SCREEN
                JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = scr.ID_LOCATION
                JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = sc.ID_MOVIE_IN_BILLBOARD
                JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
            WHERE r.ID_RECEIPT = :receiptId
            FETCH FIRST 1 ROWS ONLY`;

        const result = await connection.execute(
            request,
            { receiptId: Number(receiptId) },
            { outFormat: oracledb.OUT_FORMAT_OBJECT },
        );

        return result.rows[0] ?? null;

    } finally {
        if (connection) {
            await closeDatabaseConnection(connection);
        }
    }
};

async function sendQREmail(email, QR_list, purchase = null)
{
    const pdf= await buildTicketsPdf(QR_list);
    await emailService.sendQREmail({
        email,
        pdfBuffer: pdf,
        seats: QR_list.map((ticket) => ticket.seat),
        purchase,
    });
};

export async function sendTicketsEmail(clientId, receiptId, seats) {
    const QR_list = await Promise.all(seats.map(({ screeningId, seatId }) => QRGenerator(screeningId, seatId)));
    const email = await getUserEmail(clientId);
    const purchase = await getPurchaseEmailData(receiptId);

    await sendQREmail(email, QR_list, purchase);
}

export const QRController = async (req, res, next) => {
    try {
        const {data} = req.body;

        const QR_list = await Promise.all(data.map(async (row) => {
            const { screeningId, seatId } = row;
            return QRGenerator(screeningId, seatId);
        }));

        const { idUser } = req.params;
        const email = await getUserEmail(idUser);
        await sendQREmail(email, QR_list);

        res.status(200).json(
            {
                message:"success"
            }
        );
    } catch (error) {
        next(error);
    }
};