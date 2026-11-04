import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';

const ACTIVE_FEES_QUERY = `
  SELECT
    f.ID_FEE,
    f.TYPE,
    f.AMOUNT,
    f.ID_AUDIOVISUAL_FORMAT,
    vf.VIDEO_FORMAT_NAME || ' + ' || af.AUDIO_FORMAT_NAME AS AUDIOVISUAL_FORMAT_NAME
  FROM PI_DEVELOPERS.FEES f
    JOIN PI_DEVELOPERS.AUDIOVISUAL_FORMATS avf ON f.ID_AUDIOVISUAL_FORMAT = avf.ID_AUDIOVISUAL_FORMAT
    JOIN PI_DEVELOPERS.VIDEO_FORMATS vf ON avf.ID_VIDEO_FORMAT = vf.ID_VIDEO_FORMAT
    JOIN PI_DEVELOPERS.AUDIO_FORMATS af ON avf.ID_AUDIO_FORMAT = af.ID_AUDIO_FORMAT
  WHERE f.IS_DELETED = 0
  ORDER BY AUDIOVISUAL_FORMAT_NAME ASC, f.TYPE ASC
`;

export const getFeeList = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(ACTIVE_FEES_QUERY, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    });
    res.status(200).json({ data: result.rows });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
