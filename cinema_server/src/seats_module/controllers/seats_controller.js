import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";
import {
    RESERVATION_DURATION_MINUTES,
    clearReservationCookie,
    createReservationToken,
    readReservationToken,
    setReservationCookie
} from "../services/reservation_cookie.js";

const RESERVATION_EXPIRED_CODE = 'RESERVATION_EXPIRED';
const RESERVATION_EXPIRED_MESSAGE = 'La reserva de asientos expiró. Selecciona tus asientos de nuevo';
const SEAT_UNAVAILABLE_CODE = 'SEAT_UNAVAILABLE';
const SEAT_UNAVAILABLE_MESSAGE = 'Este asiento ya no está disponible';
const SEAT_NOT_FOUND_MESSAGE = 'El asiento no existe en esta función';
const ACTIVE_RESERVATION_CONDITION = 'r.RESERVED_UNTIL > SYSTIMESTAMP';

async function checkBoughts(connection, screeningId)
{
    const request = `
    SELECT ID_SEAT
    FROM PI_DEVELOPERS.SEAT_RECEIPTS
    WHERE ID_SCREENING = :screeningId`;

    const result = await connection.execute(
        request,
        [screeningId],
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );

    return result.rows;
}

async function checkReservations(connection, screeningId)
{
    const request = `
    SELECT rs.ID_SEAT
    FROM PI_DEVELOPERS.RESERVATIONS_SEATS rs
    JOIN PI_DEVELOPERS.RESERVATIONS r
    ON r.ID_RESERVATION = rs.ID_RESERVATION
    WHERE rs.ID_SCREENING = :screeningId
    AND ${ACTIVE_RESERVATION_CONDITION}`;

    const result = await connection.execute(
        request,
        [screeningId],
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );

    return result.rows;
}

async function findOwnReservation(connection, token, screeningId, lock)
{
    if (token?.screeningId !== Number(screeningId))
        return null;

    const lockClause = lock
        ? 'FOR UPDATE'
        : '';

    const request = `
    SELECT ID_RESERVATION, RESERVED_UNTIL
    FROM PI_DEVELOPERS.RESERVATIONS
    WHERE ID_RESERVATION = :reservationId
    AND RESERVED_UNTIL > SYSTIMESTAMP
    ${lockClause}`;

    const result = await connection.execute(
        request,
        [token.reservationId],
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );

    return result.rows[0] ?? null;
}

async function getOwnReservationSeats(connection, reservationId)
{
    const request = `
    SELECT ID_SEAT
    FROM PI_DEVELOPERS.RESERVATIONS_SEATS
    WHERE ID_RESERVATION = :reservationId`;

    const result = await connection.execute(
        request,
        [reservationId],
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );

    return result.rows.map((row) => row.ID_SEAT);
}

async function lockSeat(connection, screeningId, seatId)
{
    const request = `
    SELECT ID_SCREEN
    FROM PI_DEVELOPERS.SEATS
    WHERE ID_SCREENING = :screeningId
    AND ID_SEAT = :seatId
    FOR UPDATE`;

    const result = await connection.execute(
        request,
        {
            screeningId,
            seatId
        },
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );

    return result.rows[0] ?? null;
}

async function isSeatTaken(connection, screeningId, seatId)
{
    const request = `
    SELECT
        (SELECT COUNT(*)
        FROM PI_DEVELOPERS.SEAT_RECEIPTS
        WHERE ID_SCREENING = :screeningId
        AND ID_SEAT = :seatId)
        +
        (SELECT COUNT(*)
        FROM PI_DEVELOPERS.RESERVATIONS_SEATS rs
        JOIN PI_DEVELOPERS.RESERVATIONS r
        ON r.ID_RESERVATION = rs.ID_RESERVATION
        WHERE rs.ID_SCREENING = :screeningId
        AND rs.ID_SEAT = :seatId
        AND ${ACTIVE_RESERVATION_CONDITION}) AS TAKEN
    FROM DUAL`;

    const result = await connection.execute(
        request,
        {
            screeningId,
            seatId
        },
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );

    return result.rows[0].TAKEN > 0;
}

async function createReservation(connection)
{
    const request = `
    INSERT INTO PI_DEVELOPERS.RESERVATIONS (RESERVED_UNTIL)
    VALUES (SYSTIMESTAMP + NUMTODSINTERVAL(:minutes, 'MINUTE'))
    RETURNING ID_RESERVATION INTO :reservationId`;

    const result = await connection.execute(
        request,
        {
            minutes: RESERVATION_DURATION_MINUTES,
            reservationId: {
                dir: oracledb.BIND_OUT,
                type: oracledb.NUMBER
            }
        }
    );

    return result.outBinds.reservationId[0];
}

async function cancelReservation(connection, reservationId)
{
    const request = `
    UPDATE PI_DEVELOPERS.RESERVATIONS
    SET RESERVED_UNTIL = SYSTIMESTAMP
    WHERE ID_RESERVATION = :reservationId
    AND RESERVED_UNTIL > SYSTIMESTAMP`;

    await connection.execute(
        request,
        [reservationId]
    );
}

async function refreshReservation(connection, reservationId)
{
    const request = `
    UPDATE PI_DEVELOPERS.RESERVATIONS
    SET RESERVED_UNTIL = SYSTIMESTAMP + NUMTODSINTERVAL(:minutes, 'MINUTE')
    WHERE ID_RESERVATION = :reservationId
    RETURNING RESERVED_UNTIL INTO :reservedUntil`;

    const result = await connection.execute(
        request,
        {
            minutes: RESERVATION_DURATION_MINUTES,
            reservationId,
            reservedUntil: {
                dir: oracledb.BIND_OUT,
                type: oracledb.DB_TYPE_TIMESTAMP_TZ
            }
        }
    );

    return result.outBinds.reservedUntil[0];
}

function rejectExpiredReservation(res)
{
    clearReservationCookie(res);

    return res.status(410).json(
        {
            code: RESERVATION_EXPIRED_CODE,
            message: RESERVATION_EXPIRED_MESSAGE
        }
    );
}

export const getSeatsInfoFromScreening = async (req, res, next) => {
    let conection;
    try
    {
        conection = await getConnection();
        const { screeningId } = req.params;

        const request = `SELECT SEAT_ROW, SEAT_NUMBER, ID_SEAT
            FROM PI_DEVELOPERS.SEATS
            WHERE ID_SCREENING = :screeningId`;

        const result = await conection.execute(
            request,
            [screeningId],
            {
                outFormat: oracledb.OUT_FORMAT_OBJECT  // Convert output to JSON
            }
        );

        const bought = new Set((await checkBoughts(conection, screeningId)).map((row) => row.ID_SEAT));
        const reserved = new Set((await checkReservations(conection, screeningId)).map((row) => row.ID_SEAT));

        for (const row of result.rows)
        {
            const ID = row.ID_SEAT;
            if(bought.has(ID) || reserved.has(ID))
            {
                row.SEAT_AVAILABLE = 0;
            }
            else
            {
                row.SEAT_AVAILABLE = 1;
            }
        }

        const token = readReservationToken(req);
        const ownReservation = await findOwnReservation(conection, token, screeningId, false);
        let reservation = null;

        if (ownReservation)
        {
            reservation = {
                reservedUntil: ownReservation.RESERVED_UNTIL,
                seats: await getOwnReservationSeats(conection, ownReservation.ID_RESERVATION)
            };
        }
        else if (token?.screeningId === Number(screeningId))
        {
            clearReservationCookie(res);
        }

        res.status(200).json(
            {
                data: result.rows,
                reservation
            }
        );

    } catch (error) {
        next(error);
    } finally {
        if (conection) {
            await closeDatabaseConnection(conection);
        }
    }
};

export const reserveSeat = async (req, res, next) =>
{
    let connection;

    try
    {
        connection = await getConnection();

        const { screeningId, seatId } = req.params;
        const token = readReservationToken(req);
        const isSameScreening = token?.screeningId === Number(screeningId);
        const reservation = await findOwnReservation(connection, token, screeningId, true);

        if (isSameScreening && !reservation)
            return rejectExpiredReservation(res);

        const seat = await lockSeat(connection, screeningId, seatId);

        if (!seat)
            return res.status(404).json({ message: SEAT_NOT_FOUND_MESSAGE });

        if (await isSeatTaken(connection, screeningId, seatId))
        {
            return res.status(409).json(
                {
                    code: SEAT_UNAVAILABLE_CODE,
                    message: SEAT_UNAVAILABLE_MESSAGE
                }
            );
        }

        if (token && !isSameScreening)
            await cancelReservation(connection, token.reservationId);

        const reservationId = reservation
            ? reservation.ID_RESERVATION
            : await createReservation(connection);

        await connection.execute(
            `INSERT INTO PI_DEVELOPERS.RESERVATIONS_SEATS (ID_SEAT, ID_SCREEN, ID_SCREENING, ID_RESERVATION)
            VALUES (:seatId, :screenId, :screeningId, :reservationId)`,
            {
                seatId,
                screenId: seat.ID_SCREEN,
                screeningId,
                reservationId
            }
        );

        const reservedUntil = await refreshReservation(connection, reservationId);

        await connection.commit();

        setReservationCookie(res, createReservationToken({
            reservationId,
            screeningId: Number(screeningId)
        }));

        res.status(200).json(
            {
                data: {
                    reservedUntil
                }
            }
        );

    } catch (error)
    {
        next(error);
    } finally
    {
        await closeDatabaseConnection(connection);
    }
};

export const releaseSeat = async (req, res, next) =>
{
    let connection;

    try
    {
        connection = await getConnection();

        const { screeningId, seatId } = req.params;
        const token = readReservationToken(req);
        const reservation = await findOwnReservation(connection, token, screeningId, true);

        if (!reservation)
            return rejectExpiredReservation(res);

        await connection.execute(
            `DELETE FROM PI_DEVELOPERS.RESERVATIONS_SEATS
            WHERE ID_RESERVATION = :reservationId
            AND ID_SCREENING = :screeningId
            AND ID_SEAT = :seatId`,
            {
                reservationId: reservation.ID_RESERVATION,
                screeningId,
                seatId
            }
        );

        const reservedUntil = await refreshReservation(connection, reservation.ID_RESERVATION);

        await connection.commit();

        setReservationCookie(res, createReservationToken(token));

        res.status(200).json(
            {
                data: {
                    reservedUntil
                }
            }
        );

    } catch (error)
    {
        next(error);
    } finally
    {
        await closeDatabaseConnection(connection);
    }
};

export const cancelOwnReservation = async (req, res, next) =>
{
    let connection;

    try
    {
        const token = readReservationToken(req);

        if (token)
        {
            connection = await getConnection();

            await cancelReservation(connection, token.reservationId);
            await connection.commit();
        }

        clearReservationCookie(res);

        res.status(200).json(
            {
                message: "Reservation cancelled"
            }
        );

    } catch (error)
    {
        next(error);
    } finally
    {
        await closeDatabaseConnection(connection);
    }
};
