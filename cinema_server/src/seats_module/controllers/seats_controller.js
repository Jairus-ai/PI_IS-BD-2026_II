import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

export const getSeatsInfoFromScreening = async (req, res, next) => {
    let conection;
    try 
    {
        conection = await getConnection();
        const { screeningId } = req.params;
        
        const request = `SELECT SEAT_ROW, SEAT_NUMBER, ID_SEAT, SEAT_AVAILABLE
            FROM PI_DEVELOPERS.SEATS 
            WHERE ID_SCREENING = :screeningId`;
            
        const result = await conection.execute(
            request,
            [screeningId],
            { 
                outFormat: oracledb.OUT_FORMAT_OBJECT  // Convert output to JSON
            }
        );

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

export const markSeatAsUnavailable = async (req, res, next) => {
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