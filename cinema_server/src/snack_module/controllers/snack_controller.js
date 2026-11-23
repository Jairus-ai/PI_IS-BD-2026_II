import oracledb from "oracledb";
import { 
  getConnection,
  closeDatabaseConnection 
} from "../../database/database.js";


export function buildSnackFilters({ name } = {}) {
    const conditions = ['s.IS_DELETED = 0'];
    const binds = {};

    if (typeof name === 'string' && name.trim() !== '') 
    {
      conditions.push('LOWER(s.SNACK_NAME) LIKE LOWER(:name)');
      binds.name = `%${name.trim()}%`;
    }

    return { whereClause: `WHERE ${conditions.join(' AND ')}`, binds };
}

export const getSnackList = async (req, res, next) => {
    let connection;

    try 
    {
      const limit = 10;
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const offset = (page - 1) * limit;

      const { whereClause, binds } = buildSnackFilters({ name: req.query.name });
  
      connection = await getConnection();

      const request = `
        SELECT s.SNACK_NAME, s.PRICE,s.ID_SNACK
        FROM PI_DEVELOPERS.SNACKS s
        ${whereClause}
        ORDER BY s.ID_SNACK
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;

      const result = await connection.execute(
        request,
        { ...binds, 
          offset, 
          limit 
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );

      res.status(200).json(
        { 
          data: result.rows   
        }
      );

    }catch (error) 
    {
      next(error);
    } finally 
    {
      if (connection) 
      {
        await closeDatabaseConnection(connection);
      }
    }
};

export const countSnacks = async (req, res, next) => {
    let connection;

    try
    {
        const { whereClause, binds } = buildSnackFilters({ name: req.query.name });

        connection = await getConnection();

        const request = 
        `SELECT COUNT(s.ID_SNACK) AS TOTAL
               FROM PI_DEVELOPERS.SNACKS s
               ${whereClause}`;

        const result = await connection.execute(
          request,
          binds,
          { outFormat: oracledb.OUT_FORMAT_OBJECT },
        );

        res.status(200).json(
        { 
          total: result.rows[0].TOTAL 
        });

    } catch (error) 
    {
      next(error);
    } finally
    {
      if (connection) {
        await closeDatabaseConnection(connection);
      }
    }
};

export const getSnackByID = async(req, res, next) => 
{
  let connection;

  try{
    connection = await getConnection();
    
    const {id} = req.params;

    const request = `
      SELECT 
        s.SNACK_NAME,
        s.SNACK_DESCRIPTION,
        s.PRICE
      FROM PI_DEVELOPERS.SNACKS s
      WHERE IS_DELETED = 0 AND  ID_SNACK = :id
    `;

    const result = await connection.execute(
      request, 
      {id:Number(id)},
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    const snack = result.rows[0];

    if (!snack) 
    {
      return res.status(404).json({ message: 'Snack no encontrado' });
    }

    res.status(200).json(
    { 
      data: snack
    });

  }catch(error)
  {
    next(error);
  }finally 
  {
    if(connection)
    {
      await closeDatabaseConnection(connection);
    }
  }
};


export const createSnack = async(req, res, next) => 
{
  let connection;
  try
  {
    connection = await getConnection();
    const {SNACK_NAME, SNACK_DESCRIPTION, PRICE} = req.body;

    const sql = `
      SELECT ID_SNACK
      FROM PI_DEVELOPERS.SNACKS
      WHERE SNACK_NAME = :SNACK_NAME AND IS_DELETED = 0
    `;

    let result = await connection.execute(
      sql,
      {
        SNACK_NAME:SNACK_NAME,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    )


    if (result.rows.length > 0) 
    {
      return res.status(409).json({
        message: 'Ya existe un snack con ese nombre.',
      });
    }


    result = await connection.execute(
      `SELECT MAX(ID_SNACK) AS LAST_ID 
      FROM PI_DEVELOPERS.SNACKS`, 
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT}  // Convert output to JSON
    );

    const lastId = result.rows[0].LAST_ID ?? 0;
    const ID_SNACK = lastId + 1;  

    const request = `
      INSERT INTO PI_DEVELOPERS.SNACKS(ID_SNACK, SNACK_NAME, SNACK_DESCRIPTION, PRICE)
      VALUES
      (
        :ID_SNACK,
        :SNACK_NAME,
        :SNACK_DESCRIPTION,
        :PRICE
      )
    `;
    
    await connection.execute(
      request,
      {
        ID_SNACK:ID_SNACK,
        SNACK_NAME: SNACK_NAME, 
        SNACK_DESCRIPTION: SNACK_DESCRIPTION, 
        PRICE: PRICE
      },
      {
        autoCommit: true
      }
    );
    
    res.status(201).json(
      {
        message:'success'
      }
    );
    
  }catch(error)
  {
    next(error);
  }finally
  {
    if(connection)
    {
      await closeDatabaseConnection(connection);
    }
  }

};

export const editSnack = async(req, res, next) =>
{
  let connection;

  try
  {
    connection = await getConnection();

    const {id} = req.params;
    const {SNACK_NAME, SNACK_DESCRIPTION, PRICE} = req.body;

    const sql = `
      SELECT ID_SNACK
      FROM PI_DEVELOPERS.SNACKS
      WHERE SNACK_NAME = :SNACK_NAME AND IS_DELETED = 0 AND ID_SNACK <> :id
    `;

    let result = await connection.execute(
      sql,
      {
        SNACK_NAME:SNACK_NAME,
        id:id,
      },
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    )


    if (result.rows.length > 0) 
    {
      return res.status(409).json({
        message: 'Ya existe un snack con ese nombre.',
      });
    }

    const request = `
      UPDATE PI_DEVELOPERS.SNACKS
      SET
      SNACK_NAME = :SNACK_NAME,
      SNACK_DESCRIPTION = :SNACK_DESCRIPTION,
      PRICE = :PRICE
      WHERE ID_SNACK = :id
    `;

    await connection.execute(
      request,
      {
        SNACK_NAME :SNACK_NAME,
        SNACK_DESCRIPTION:SNACK_DESCRIPTION,
        PRICE:PRICE,
        id,
      },
      {
        autoCommit: true
      }
    );

    res.status(200).json(
      {
        message:'success'
      }
    );    

  }catch(error)
  {
    if (error.errorNum === 1) {
      return res.status(409).json({
        message: 'Ya existe un snack con ese nombre.',
      });
    }
    next(error);
  }finally
  {
    if (connection)
    {
      await closeDatabaseConnection(connection);
    }
  }
};

export const deleteSnack = async (req,res,next) =>
{
  let connection;
  try{

    const { id } = req.params;

    if (!Number.isInteger(Number(id))) 
    {
      return res.status(400).json({ message: 'ID invalida' });
    }
    
    connection = await oracledb.getConnection();

    const request = `
      UPDATE PI_DEVELOPERS.SNACKS
      SET IS_DELETED = 1
      WHERE ID_SNACK = :id
      `;

      const result = await connection.execute(
      request,
      {id: Number(id)},
      { 
        autoCommit: true
      }
    );
  
    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Snack no encontrado' });
    }

    res.status(204).json(
      {
        message: 'success'
      }
    );

    
  }catch (error) {
    next(error);
  }finally {
    if (connection) {
      await closeDatabaseConnection(connection);
    }
  }
};
