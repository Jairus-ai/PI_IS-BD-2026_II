import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

export const getDiscountList = async (req, res, next) => 
  {
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
      await closeDatabaseConnection(connection);
    }
  }
};

async function SnackName(connection, idSnack) 
{

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

export const getDiscountByID = async (req, res, next) => 
  {
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
        row.NAME_FK_PRODUCT = row.ID_MOVIE_IN_BILLBOARD;
      }else{
        row.TYPE = 'SNACK';
        row.NAME_FK_PRODUCT = snackNames[index];
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
      await closeDatabaseConnection(connection);
    }
  }
}

export const getDiscountProducts = async (req, res, next ) =>
{
  let connection;
  
  try 
  {
    connection = await oracledb.getConnection();

    const request = 
    `SELECT SNACK_NAME, ID_SNACK
      FROM PI_DEVELOPERS.SNACKS`

    const result = await connection.execute(
      request, [], 
      { 
        outFormat: oracledb.OUT_FORMAT_OBJECT  // Convert output to JSON
      }
    );

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
      await closeDatabaseConnection(connection);
    }
  }
};


export const addDiscount = async (req, res, next) => 
  {
  let connection;

  try
  {
    connection = await oracledb.getConnection();

    const result = await connection.execute(
      'SELECT MAX(ID_DISCOUNT) AS LAST_ID FROM PI_DEVELOPERS.DISCOUNTS', [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT}  // Convert output to JSON
    );

    const lastId = result.rows[0].LAST_ID ?? 0;   // 121, o 0 si la tabla está vacía
    const newId = lastId + 1;  

    const { DISCOUNT_NAME, DISCOUNT_PORCENTAGE, DISCOUNT_START_DATE, DISCOUNT_FINISH_DATE,  ID_FK_PRODUCT } = req.body;

    const request = 
    `INSERT INTO PI_DEVELOPERS.DISCOUNTS (
      ID_DISCOUNT, DISCOUNT_NAME, DISCOUNT_PORCENTAGE, DISCOUNT_START_DATE, DISCOUNT_FINISH_DATE, ID_SNACKS
      )
      VALUES (
      :ID, :NAME, :PORCENTAGE, TO_DATE(:START_DATE, 'YYYY-MM-DD'), TO_DATE(:FINISH_DATE, 'YYYY-MM-DD'), :PRODUCT
      )`

      await connection.execute(
        request,
        {
          ID:newId,
          NAME: DISCOUNT_NAME,
          PORCENTAGE: Number(DISCOUNT_PORCENTAGE),
          START_DATE: DISCOUNT_START_DATE,
          FINISH_DATE: DISCOUNT_FINISH_DATE,
          PRODUCT: ID_FK_PRODUCT
        },
        { autoCommit: true }
      )

    res.status(200).json(
      {
        message:'succes'
      }
    );
  } catch (error) 
  {
    next(error);
  } finally 
  {
    if(connection)
    {
      await closeDatabaseConnection(connection);
    }
  }
}