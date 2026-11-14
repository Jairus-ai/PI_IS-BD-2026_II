import oracledb from "oracledb";
import { 
  getConnection,
  closeDatabaseConnection 
} from "../../database/database.js";

export const getLocationsList = async (req, res, next) => 
{
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `
        SELECT
          ID_LOCATION,
          LOCATION_NAME
        FROM PI_DEVELOPERS.LOCATIONS
        WHERE IS_DELETED = 0
        ORDER BY LOCATION_NAME
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({
      data: result.rows,
    });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export function buildLocationFilters({ name } = {}) {
    const conditions = ['l.IS_DELETED = 0'];
    const binds = {};

    if (typeof name === 'string' && name.trim() !== '') 
    {
      conditions.push('LOWER(l.LOCATION_NAME) LIKE LOWER(:name)');
      binds.name = `%${name.trim()}%`;
    }

    return { whereClause: `WHERE ${conditions.join(' AND ')}`, binds };
}

export const getLocationListForCrud = async (req, res, next) => {
    let connection;

    try 
    {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const limit = 10;
      const offset = (page - 1) * limit;

      const { whereClause, binds } = buildLocationFilters({ name: req.query.name });
  
      connection = await getConnection();

      const request = `
        SELECT l.ID_LOCATION,
          l.LOCATION_NAME,
          TO_CHAR(EXTRACT(HOUR FROM l.OPENING_HOUR), 'FM00') || ':' ||
          TO_CHAR(EXTRACT(MINUTE FROM l.OPENING_HOUR), 'FM00') AS OPENING_HOUR,
          TO_CHAR(EXTRACT(HOUR FROM l.CLOSING_HOUR), 'FM00') || ':' ||
          TO_CHAR(EXTRACT(MINUTE FROM l.CLOSING_HOUR), 'FM00') AS CLOSING_HOUR,
          c.CANTON_NAME
        FROM PI_DEVELOPERS.LOCATIONS l
        JOIN PI_DEVELOPERS.CANTONS c 
        ON c.ID_CANTON = l.ID_CANTON
        ${whereClause}
        ORDER BY l.LOCATION_NAME, l.ID_LOCATION
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

export const countLocations = async (req, res, next) => {
    let connection;

    try
    {
        const { whereClause, binds } = buildLocationFilters({ name: req.query.name });

        connection = await getConnection();

        const request = 
        `SELECT COUNT(l.ID_LOCATION) AS TOTAL
               FROM PI_DEVELOPERS.LOCATIONS l
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

export const getCantonsforLocation = async(req, res, next) =>
{
  let connection;

  try
  {
    connection = await getConnection();
    const p = req.query.provinceId

    const request = `
      SELECT ID_CANTON, CANTON_NAME
      FROM PI_DEVELOPERS.CANTONS c
      JOIN PI_DEVELOPERS.PROVINCES p
      ON p.ID_PROVINCE = c.ID_PROVINCE
      WHERE p.ID_PROVINCE = :p
      ORDER BY CANTON_NAME
    `;

    const result = await connection.execute(
      request,
      {p:p},
      {outFormat: oracledb.OUT_FORMAT_OBJECT}
    );

    res.status(200).json(
    { 
      data: result.rows 
    });

  }catch(error)
  {
    next(error)
  }finally
  {
    if(connection)
    {
      await closeDatabaseConnection(connection);
    }
  }
}

export const getProvincesforLocation = async(req, res, next) =>
{
  let connection;

  try
  {
    connection = await getConnection();

    const request = `
      SELECT ID_PROVINCE, PROVINCE_NAME
      FROM PI_DEVELOPERS.PROVINCES
      ORDER BY PROVINCE_NAME
    `;

    const result = await connection.execute(
      request,
      {},
      {outFormat: oracledb.OUT_FORMAT_OBJECT}
    );

    res.status(200).json(
    { 
      data: result.rows 
    });

  }catch(error)
  {
    next(error)
  }finally
  {
    if(connection)
    {
      await closeDatabaseConnection(connection);
    }
  }
}

export const getLocationByID = async(req, res, next) => 
{
  let connection;

  try{
    connection = await getConnection();
    
    const {id} = req.params;

    const request = `
      SELECT 
        l.LOCATION_NAME,
        TO_CHAR(EXTRACT(HOUR FROM l.OPENING_HOUR), 'FM00') || ':' ||
        TO_CHAR(EXTRACT(MINUTE FROM l.OPENING_HOUR), 'FM00') AS OPENING_HOUR,
        TO_CHAR(EXTRACT(HOUR FROM l.CLOSING_HOUR), 'FM00') || ':' ||
        TO_CHAR(EXTRACT(MINUTE FROM l.CLOSING_HOUR), 'FM00') AS CLOSING_HOUR,
        c.CANTON_NAME,
        p.PROVINCE_NAME
      FROM PI_DEVELOPERS.LOCATIONS l
      JOIN PI_DEVELOPERS.CANTONS c 
      ON c.ID_CANTON = l.ID_CANTON
      JOIN PI_DEVELOPERS.PROVINCES p
      ON p.ID_PROVINCE = c.ID_PROVINCE
      WHERE IS_DELETED = 0 AND ID_LOCATION = :id 
      ORDER BY LOCATION_NAME
    `;

    const result = await connection.execute(
      request, 
      {id:Number(id)},
      {
        outFormat: oracledb.OUT_FORMAT_OBJECT
      }
    );

    const location = result.rows[0];

    if (!location) 
    {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.status(200).json(
    { 
      data: location 
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

async function getCantonId(canton_name, connection)
{
  const request = `
    SELECT ID_CANTON 
    FROM PI_DEVELOPERS.CANTONS
    WHERE CANTON_NAME = :name
  `;

  const result = await connection.execute(
    request,
    {
      name:canton_name,
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    }
  );
  return result.rows[0]?.ID_CANTON ?? null;
};

export const createLocation = async(req, res, next) => 
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
