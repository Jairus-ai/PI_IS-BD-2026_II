import oracledb from "oracledb";

export const getDiscountList = async (req, res, next) => {
  let connection;
  
  try 
  {
    connection = await oracledb.getConnection();

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

export const getDiscountByName = async (req, res, next) => {
  let connection;
  
  try 
  {
    const { name } = req.params;

    connection = await oracledb.getConnection();

    /*TODO: define better what is going to get gotten*/
    const request = `
      SELECT *
      FROM PI_DEVELOPERS.DISCOUNTS
      WHERE DISCOUNT_NAME = :name`;

    const result = await connection.execute(
      request,
      {name: String(name)}, 
      { outFormat: oracledb.OUT_FORMAT_OBJECT}  // Convert output to JSON
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

export const getDiscountByID = async (req, res, next) => {
  let connection;
  
  try 
  {
    const { id } = req.params;
    
    connection = await oracledb.getConnection();

    /*TODO: define better what is going to get gotten*/
    const request = `
      SELECT *
      FROM PI_DEVELOPERS.DISCOUNTS
      WHERE ID_DISCOUNT = :id`;

    const result = await connection.execute(
      request,
      {id: Number(id)}, 
      { outFormat: oracledb.OUT_FORMAT_OBJECT}  // Convert output to JSON
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