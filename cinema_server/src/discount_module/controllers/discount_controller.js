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
      FROM PI_DEVELOPERS.DISCOUNTS
      WHERE IS_DELETED=0`;

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

async function MovieName(connection, idMovieInBillboard) {
  const result = await connection.execute(
    `SELECT m.MOVIE_TITLE||' del cine '|| l.LOCATION_NAME AS "Movie"
       FROM PI_DEVELOPERS.MOVIES_IN_BILLBOARDS b
       JOIN PI_DEVELOPERS.MOVIES m 
       ON m.ID_MOVIE = b.ID_MOVIE
       JOIN PI_DEVELOPERS.LOCATIONS l
       ON b.ID_LOCATION = l.ID_LOCATION
      WHERE b.ID_MOVIE_IN_BILLBOARD = :id`,
    { id: Number(idMovieInBillboard) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0]?.Movie ?? null;
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
      WHERE ID_DISCOUNT = :id AND IS_DELETED = 0`;

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

    const movieNames = await Promise.all(
      result.rows.map(row =>
        row.ID_MOVIE_IN_BILLBOARD == null ? null : MovieName(connection, row.ID_MOVIE_IN_BILLBOARD)
      )
    );

    for (const [index, row] of result.rows.entries()) {
      if (row.ID_SNACKS == null)
      {
        row.TYPE = 'PELICULA';
        row.NAME_FK_PRODUCT = movieNames[index];
        row.ID_FK_PRODUCT = row.ID_MOVIE_IN_BILLBOARD;
      }else
      {
        row.TYPE = 'SNACK';
        row.NAME_FK_PRODUCT = snackNames[index];
        row.ID_FK_PRODUCT = row.ID_SNACKS;
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
    const {type} = req.params;
    let request;

    connection = await oracledb.getConnection();

    if(type == 'SNACK')
    {
      request =
      `SELECT SNACK_NAME as "PRODUCT_NAME", ID_SNACK as "ID_PRODUCT"
        FROM PI_DEVELOPERS.SNACKS`
    }else if (type == 'PELICULA')
    {
      request =
      `SELECT m.MOVIE_TITLE||' del cine '|| l.LOCATION_NAME AS "PRODUCT_NAME", b.ID_MOVIE_IN_BILLBOARD as "ID_PRODUCT"
      FROM PI_DEVELOPERS.MOVIES_IN_BILLBOARDS b
      JOIN PI_DEVELOPERS.MOVIES m 
      ON m.ID_MOVIE = b.ID_MOVIE
      JOIN PI_DEVELOPERS.LOCATIONS l
      ON b.ID_LOCATION = l.ID_LOCATION`
    }else
    {
      return res.status(400).json({ message: 'Invalid product type' });
    }
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
    const { type } = req.params;

    const result = await connection.execute(
      `SELECT MAX(ID_DISCOUNT) AS LAST_ID 
      FROM PI_DEVELOPERS.DISCOUNTS 
      WHERE IS_DELETED = 0`, [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT}  // Convert output to JSON
    );

    const lastId = result.rows[0].LAST_ID ?? 0;
    const newId = lastId + 1;  

    const { DISCOUNT_NAME, DISCOUNT_PORCENTAGE, DISCOUNT_START_DATE, DISCOUNT_FINISH_DATE,  ID_FK_PRODUCT } = req.body;

    let request;
    if(type == 'SNACK')
    {
      request = 
        `INSERT INTO PI_DEVELOPERS.DISCOUNTS (
          ID_DISCOUNT, DISCOUNT_NAME, DISCOUNT_PORCENTAGE, DISCOUNT_START_DATE, DISCOUNT_FINISH_DATE, ID_SNACKS
          )
          VALUES (
          :ID, :NAME, :PORCENTAGE, TO_DATE(:START_DATE, 'YYYY-MM-DD'), TO_DATE(:FINISH_DATE, 'YYYY-MM-DD'), :PRODUCT
          )` 
    }else if(type == 'PELICULA')
    {
      request =
        `INSERT INTO PI_DEVELOPERS.DISCOUNTS (
          ID_DISCOUNT, DISCOUNT_NAME, DISCOUNT_PORCENTAGE, DISCOUNT_START_DATE, DISCOUNT_FINISH_DATE, ID_MOVIE_IN_BILLBOARD
          )
          VALUES (
          :ID, :NAME, :PORCENTAGE, TO_DATE(:START_DATE, 'YYYY-MM-DD'), TO_DATE(:FINISH_DATE, 'YYYY-MM-DD'), :PRODUCT
          )`
    }else
    {
      return res.status(400).json({ message: 'Invalid product type' });
    }

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
};

export const deleteDiscount = async (req,res,next) =>
{
  let connection;
  try{
    const { id } = req.params;

    connection = await oracledb.getConnection();
    const request = `
      UPDATE PI_DEVELOPERS.DISCOUNTS
      SET IS_DELETED = 1
      WHERE ID_DISCOUNT = :id`;

    const result = await connection.execute(
      request,
      {id: Number(id)}, 
      { autoCommit: true }  // Convert output to JSON
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Discount not found' });
    }
  
    res.status(204).send();
  }catch (error) {
    if (error.errorNum === 2292) {
      return res.status(409).json({ message: 'Discount is in use and cannot be deleted' });
    }
    next(error);
  }finally {
    if (connection) {
      await closeDatabaseConnection(connection);
    }
  }
};

export const modifyDiscount = async (req,res,next) =>
{
  let connection;
  try{
    connection = await oracledb.getConnection();
    const {id,type} = req.params;

    const {DISCOUNT_NAME, DISCOUNT_PORCENTAGE, DISCOUNT_START_DATE, DISCOUNT_FINISH_DATE,  ID_FK_PRODUCT } = req.body;

    let request;
    if(type == 'SNACK')
    {
      request = 
        `UPDATE PI_DEVELOPERS.DISCOUNTS
          SET
          DISCOUNT_NAME = :NAME, 
          DISCOUNT_PORCENTAGE = :PORCENTAGE,
          DISCOUNT_START_DATE = TO_DATE(:START_DATE, 'YYYY-MM-DD'), 
          DISCOUNT_FINISH_DATE = TO_DATE(:FINISH_DATE, 'YYYY-MM-DD'), 
          ID_SNACKS = :PRODUCT
          WHERE ID_DISCOUNT= :id`
    }else if(type == 'PELICULA')
    {
      request =
        `UPDATE PI_DEVELOPERS.DISCOUNTS
          SET
          DISCOUNT_NAME = :NAME, 
          DISCOUNT_PORCENTAGE = :PORCENTAGE,
          DISCOUNT_START_DATE = TO_DATE(:START_DATE, 'YYYY-MM-DD'), 
          DISCOUNT_FINISH_DATE = TO_DATE(:FINISH_DATE, 'YYYY-MM-DD'), 
          ID_MOVIE_IN_BILLBOARD = :PRODUCT
          WHERE ID_DISCOUNT= :id`
    }else
    {
      return res.status(400).json({ message: 'Invalid product type' });
    }

      await connection.execute(
        request,
        {
          NAME: DISCOUNT_NAME,
          PORCENTAGE: Number(DISCOUNT_PORCENTAGE),
          START_DATE: DISCOUNT_START_DATE,
          FINISH_DATE: DISCOUNT_FINISH_DATE,
          PRODUCT: ID_FK_PRODUCT,
          id: Number(id)
        },
        { autoCommit: true }
      )

    res.status(200).json(
      {
        message:'succes'
      }
    );
  }catch (error) {
    if (error.errorNum === 2292) {
      return res.status(409).json({ message: 'Discount is in use and cannot be modified' });
    }
    next(error);
  }finally {
    if (connection) {
      await closeDatabaseConnection(connection);
    }
  }
}