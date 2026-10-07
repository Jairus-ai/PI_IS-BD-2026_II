import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

export const getDiscountList = async (req, res, next) => {
  let connection;
  
  try 
  {
    connection = await getConnection();

    const request = 
    `SELECT ID_DISCOUNT, DISCOUNT_NAME, 
      DISCOUNT_PORCENTAGE,  
      TO_CHAR(DISCOUNT_START_DATE,  'YYYY-MM-DD') AS DISCOUNT_START_DATE, 
      TO_CHAR(DISCOUNT_FINISH_DATE, 'YYYY-MM-DD') AS DISCOUNT_FINISH_DATE
      FROM PI_DEVELOPERS.DISCOUNTS`;

    const result = await connection.execute(
      request, [], 
      { 
        outFormat: oracledb.OUT_FORMAT_OBJECT  // Convert output to JSON
      }
    );

    const today = new Date().toLocaleDateString('en-CA');

    for (const row of result.rows) {
      const SD = row.DISCOUNT_START_DATE;
      const FD = row.DISCOUNT_FINISH_DATE;

      if (today < SD) {
        row.DISCOUNT_STATE = 'próximo';
      } else if (today > FD) {
        row.DISCOUNT_STATE = 'finalizado';
      } else {
        row.DISCOUNT_STATE = 'activo';
      }

      delete row.DISCOUNT_FINISH_DATE;
      delete row.DISCOUNT_START_DATE;
    }

    res.status(200).json(
      {
        data: result.rows
      }
    );

  } catch (error) 
  {
    next(error);
  } finally 
  {
    if(connection)
    {
      try
      {
        await connection.close();
      }catch (error)
      {
        console.error("Error closing connection to the database: ", error);
      }finally 
      {
        await closeDatabaseConnection(connection);
      }
      
    }
  }
};

async function SnackName(connection, idSnack) {

  const request = `
    SELECT SNACK_NAME
    FROM PI_DEVELOPERS.SNACKS
    WHERE ID_SNACK = :id`;


  const result = await connection.execute(
    request,
    { id: Number(idSnack) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0]?.SNACK_NAME ?? null;
}

export const getDiscountByID = async (req, res, next) => {
  let connection;
  
  try 
  {
    const { id } = req.params;
    
    connection = await oracledb.getConnection();
    const request = `
      SELECT ID_DISCOUNT,
      DISCOUNT_NAME,
      DISCOUNT_PORCENTAGE,
      TO_CHAR(DISCOUNT_START_DATE,  'DD/MM/YYYY') AS DISCOUNT_START_DATE,
      TO_CHAR(DISCOUNT_FINISH_DATE, 'DD/MM/YYYY') AS DISCOUNT_FINISH_DATE,
      ID_SNACKS,
      ID_MOVIE_IN_BILLBOARD
      FROM PI_DEVELOPERS.DISCOUNTS
      WHERE ID_DISCOUNT = :id`;

    const result = await connection.execute(
      request,
      {id: Number(id)}, 
      { outFormat: oracledb.OUT_FORMAT_OBJECT}  // Convert output to JSON
    );

    const snackNames = await Promise.all(
      result.rows.map(row =>
        row.ID_SNACKS == null ? null : SnackName(connection, row.ID_SNACKS)
      )
    );

    for (const [index, row] of result.rows.entries()) {
      if (row.ID_SNACKS == null)
      {
        row.TYPE = 'PELICULA EN CARTELERA';
        row.ID_FK_PRODUCT = row.ID_MOVIE_IN_BILLBOARD;
      }else{
        row.TYPE = 'SNACK';
        row.ID_FK_PRODUCT = snackNames[index];
      }

      delete row.ID_SNACKS;
      delete row.ID_MOVIE_IN_BILLBOARD;
    }

    res.status(200).json(
      {
        data: result.rows
      }
    );

  } catch (error) 
  {
    next(error);
  } finally 
  {
    if(connection)
    {
      try
      {
        await connection.close();
      }catch (error)
      {
        console.error("Error closing connection to the database: ", error);
      }finally 
      {
        await closeDatabaseConnection(connection);
      }
    }
  }
}