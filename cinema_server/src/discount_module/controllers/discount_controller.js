import oracledb from "oracledb";
import { getConnection, closeDatabaseConnection } from "../../database/database.js";

export const getDiscountByName = async (req, res, next) => {
  let connection;
  
  try 
  {
    connection = await getConnection();

    /*TODO: define better what is going to get gotten*/
    const request = `
      SELECT ID_DISCOUNT, DISCOUNT_NAME, DISCOUNT_PORCENTAGE
      FROM DISCOUNTS
      WHERE DISCOUNT_NAME = ` + req;

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
    await closeDatabaseConnection(connection);
  }
}

export const getDiscountList = async (req, res, next) => {
  let connection;
  
  try 
  {
    connection = await getConnection();

    /*TODO: define better what is going to get gotten*/
    const request = 
    `SELECT ID_DISCOUNT, DISCOUNT_NAME, DISCOUNT_PORCENTAGE
      FROM PI_DEVELOPERS.DISCOUNTS`;

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


    console.log("fuck");

  } catch (error) 
  {
    next(error);
    console.log("fucksss");
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

    console.log("fucksx");
  }
};