import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { validateFee } from '../validators/fee_validator.js';

const OBJECT_FORMAT = { outFormat: oracledb.OUT_FORMAT_OBJECT };

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

const FEE_TYPE_LABELS = { G: 'General', N: 'Niño', E: 'Estudiante', M: 'Adulto mayor' };
const UNIQUE_CONSTRAINT_ERROR = 1;
const FORMAT_NOT_FOUND_MESSAGE = 'El formato audiovisual seleccionado no existe';

const ACTIVE_FORMAT_NAME_QUERY = `
  SELECT vf.VIDEO_FORMAT_NAME || ' + ' || af.AUDIO_FORMAT_NAME AS AUDIOVISUAL_FORMAT_NAME
  FROM PI_DEVELOPERS.AUDIOVISUAL_FORMATS avf
    JOIN PI_DEVELOPERS.VIDEO_FORMATS vf ON avf.ID_VIDEO_FORMAT = vf.ID_VIDEO_FORMAT
    JOIN PI_DEVELOPERS.AUDIO_FORMATS af ON avf.ID_AUDIO_FORMAT = af.ID_AUDIO_FORMAT
  WHERE avf.ID_AUDIOVISUAL_FORMAT = :formatId
    AND avf.IS_DELETED = 0
`;

const ACTIVE_FEE_BY_TYPE_AND_FORMAT_QUERY = `
  SELECT ID_FEE
  FROM PI_DEVELOPERS.FEES
  WHERE TYPE = :type
    AND ID_AUDIOVISUAL_FORMAT = :formatId
    AND IS_DELETED = 0
`;

const INSERT_FEE_QUERY = `
  INSERT INTO PI_DEVELOPERS.FEES (TYPE, AMOUNT, ID_AUDIOVISUAL_FORMAT)
  VALUES (:type, :amount, :formatId)
  RETURNING ID_FEE INTO :feeId
`;

function getDuplicateFeeMessage(type, formatName) {
  return `Ya existe una tarifa ${FEE_TYPE_LABELS[type]} activa para ${formatName}`;
}

function duplicateFeeResponse(res, type, formatName) {
  const message = getDuplicateFeeMessage(type, formatName);
  return res.status(409).json({ message, errors: { formatId: message } });
}

export const addFee = async (req, res, next) => {
  const { errors, fee } = validateFee(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;
  let formatName;
  try {
    connection = await getConnection();

    const formatResult = await connection.execute(ACTIVE_FORMAT_NAME_QUERY, { formatId: fee.formatId }, OBJECT_FORMAT);
    formatName = formatResult.rows[0]?.AUDIOVISUAL_FORMAT_NAME;
    if (!formatName) {
      return res.status(400).json({ errors: { formatId: FORMAT_NOT_FOUND_MESSAGE } });
    }

    const duplicateResult = await connection.execute(
      ACTIVE_FEE_BY_TYPE_AND_FORMAT_QUERY,
      { type: fee.type, formatId: fee.formatId },
      OBJECT_FORMAT
    );
    if (duplicateResult.rows.length > 0) {
      return duplicateFeeResponse(res, fee.type, formatName);
    }

    const insertResult = await connection.execute(INSERT_FEE_QUERY, {
      type: fee.type,
      amount: fee.amount,
      formatId: fee.formatId,
      feeId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    });
    await connection.commit();

    res.status(201).json({
      data: {
        ID_FEE: insertResult.outBinds.feeId[0],
        TYPE: fee.type,
        AMOUNT: fee.amount,
        ID_AUDIOVISUAL_FORMAT: fee.formatId,
        AUDIOVISUAL_FORMAT_NAME: formatName
      }
    });
  } catch (error) {
    //unique index protects two requests saving the same fee at the same time (double click)
    if (error.errorNum === UNIQUE_CONSTRAINT_ERROR && formatName) {
      return duplicateFeeResponse(res, fee.type, formatName);
    }
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
