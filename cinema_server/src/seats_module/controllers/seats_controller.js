import oracledb, { autoCommit, outFormat } from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

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
    SELECT ID_SEAT
    FROM PI_DEVELOPERS.RESERVATIONS_SEATS rs
    JOIN PI_DEVELOPERS.RESERVATIONS r
    ON r.ID_RESERVATION = rs.ID_RESERVATION
    WHERE ID_SCREENING = :screeningId 
    AND (SYSTIMESTAMP - TRUNC(SYSTIMESTAMP)) < r.RESERVED_UNTIL `;

    const result = await connection.execute(
        request,
        [screeningId],
        {
            outFormat: oracledb.OUT_FORMAT_OBJECT
        }
    );

    return result.rows;
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

        res.status(200).json(
            {
                data: result.rows
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


export const markSeatAsUnavailable = async (req, res, next) => 
{
    let conection;
    try
    {
        conection = await getConnection();

        const { screeningId, seatId } = req.params;

        const request = `UPDATE PI_DEVELOPERS.SEATS 
            SET SEAT_AVAILABLE = 0 
            WHERE ID_SCREENING = :screeningId 
                AND ID_SEAT = :seatId`;

        await conection.execute(
            request,
            [screeningId, seatId],
            { autoCommit: true }
        );

        res.status(200).json(
            { 
                message: "Seat marked as unavailable" 
            }
        );

    }catch (error)
    {
        next(error);
    } finally
    {
        if (conection) {
            await closeDatabaseConnection(conection);
        }
    }
};

export const markSeatAsAvailable = async (req, res, next) => {
    let conection;
    try
    {
        conection = await getConnection();

        const { screeningId, seatId } = req.params;
        
        const request = `UPDATE PI_DEVELOPERS.SEATS 
            SET SEAT_AVAILABLE = 1 
            WHERE ID_SCREENING = :screeningId 
                AND ID_SEAT = :seatId`;

        await conection.execute(
            request,
            [screeningId, seatId],
            { autoCommit: true }
        );

        res.status(200).json(
            { 
                message: "Seat marked as available" 
            }
        );

    }catch (error)
    {
        next(error);
    } finally
    {
        if (conection) {
            await closeDatabaseConnection(conection);
        }
    }
};