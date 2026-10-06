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

    for (let i = 0; i < result.rows.length; i++) {
      const SD = result.rows[i].DISCOUNT_START_DATE;
      const FD = result.rows[i].DISCOUNT_FINISH_DATE;

      if (today < SD) {
        result.rows[i].DISCOUNT_STATE = 'próximo';
      } else if (today > FD) {
        result.rows[i].DISCOUNT_STATE = 'finalizado';
      } else {
        result.rows[i].DISCOUNT_STATE = 'activo';
      }

      delete result.rows[i].DISCOUNT_FINISH_DATE;
      delete result.rows[i].DISCOUNT_START_DATE;
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

    /*TODO: define better what is going to get gotten*/
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

    for (let i = 0; i < result.rows.length; i++) {
      const Snack = result.rows[i].ID_SNACKS;
      const movie = result.rows[i].ID_MOVIE_IN_BILLBOARD;

      if(Snack == null)
      {
        result.rows[i].TYPE = 'PELICULA EN CARTELERA';
        result.rows[i].ID_FK_PRODUCT = result.rows[i].ID_MOVIE_IN_BILLBOARD;
      }else{
        result.rows[i].TYPE = 'SNACK';
        result.rows[i].ID_FK_PRODUCT = await SnackName(connection, Snack);
      }

      delete result.rows[i].ID_SNACKS;
      delete result.rows[i].ID_MOVIE_IN_BILLBOARD;
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
      }
    }
  }
}