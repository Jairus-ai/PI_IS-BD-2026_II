import oracledb from "oracledb";

export const getDiscountList = async (req, res, next) => {
  let connection;
  
  try 
  {
    connection = await oracledb.getConnection();

    /*TODO: define better what is going to get gotten*/
    const request = `
      SELECT ID_DISCOUNT, DISCOUNT_PORCENTAGE
      FROM DISCOUNTS
    `;

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