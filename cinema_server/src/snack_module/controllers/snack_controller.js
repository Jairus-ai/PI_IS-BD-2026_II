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
      return res.status(404).json({ message: 'Snack not found' });
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

//for the other stories
/*
export const createSnack = async(req, res, next) => 
{
  let connection;
  try
  {
    const {LOCATION_NAME, OPENING_HOUR, CLOSING_HOUR, CANTON_NAME,} = req.body;
    connection = await getConnection();

    const ID_CANTON = await getCantonId(CANTON_NAME, connection);

    const request = `
      INSERT INTO PI_DEVELOPERS.LOCATIONS(LOCATION_NAME, OPENING_HOUR, CLOSING_HOUR, ID_CANTON)
      VALUES
      (
        :LOCATION_NAME,
        TO_DSINTERVAL('0 ' || :OPENING_HOUR || ':00'),
        TO_DSINTERVAL('0 ' || :CLOSING_HOUR || ':00'),
        :ID_CANTON
      )
    `;
    
    await connection.execute(
      request,
      {
        LOCATION_NAME: LOCATION_NAME, 
        OPENING_HOUR: OPENING_HOUR, 
        CLOSING_HOUR: CLOSING_HOUR,
        ID_CANTON: ID_CANTON
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
    const {LOCATION_NAME, OPENING_HOUR, CLOSING_HOUR, CANTON_NAME,} = req.body;
    connection = await getConnection();

    const ID_CANTON = await getCantonId(CANTON_NAME, connection);
    const {id} = req.params;

    const request = `
      UPDATE PI_DEVELOPERS.LOCATIONS
      SET
      LOCATION_NAME = :LOCATION_NAME,
      OPENING_HOUR = TO_DSINTERVAL('0 ' || :OPENING_HOUR || ':00'),
      CLOSING_HOUR = TO_DSINTERVAL('0 ' || :CLOSING_HOUR || ':00'),
      ID_CANTON = :ID_CANTON
      WHERE ID_LOCATION = :id
    `;

    await connection.execute(
      request,
      [
        LOCATION_NAME,
        OPENING_HOUR,
        CLOSING_HOUR,
        ID_CANTON,
        id,
      ],
      {
        autoCommit: true
      }
    );

    res.status(200).json(
      {
        message:'succes'
      }
    );    

  }catch(error)
  {
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
      console.log(Number.isInteger(id));
      return res.status(400).json({ message: 'Invalid snack id' });
    }

    connection = await oracledb.getConnection();

    const hasScreenings = await checkScreenings(connection, id);

    if(hasScreenings)
    {
      return res.status(409).json({message:'Location has active screenings'})
    };
    
    const request = `
      UPDATE PI_DEVELOPERS.LOCATIONS
      SET IS_DELETED = 1
      WHERE ID_LOCATION = :id
      `;

      const result = await connection.execute(
      request,
      {id: Number(id)},
      { 
        autoCommit: true
      }
    );
  
    if (result.rowsAffected === 0) {
      return res.status(404).json({ message: 'Location not found' });
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
};*/