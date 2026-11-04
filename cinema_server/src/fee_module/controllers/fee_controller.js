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

//excludeFeeId allows a fee being modified keep its own type and format
const ACTIVE_FEE_BY_TYPE_AND_FORMAT_QUERY = `
  SELECT ID_FEE
  FROM PI_DEVELOPERS.FEES
  WHERE TYPE = :type
    AND ID_AUDIOVISUAL_FORMAT = :formatId
    AND IS_DELETED = 0
    AND ID_FEE <> :excludeFeeId
`;

const ACTIVE_FEE_BY_ID_QUERY = `
  SELECT ID_FEE
  FROM PI_DEVELOPERS.FEES
  WHERE ID_FEE = :feeId
    AND IS_DELETED = 0
`;

const UPDATE_FEE_QUERY = `
  UPDATE PI_DEVELOPERS.FEES
  SET TYPE = :type,
      AMOUNT = :amount,
      ID_AUDIOVISUAL_FORMAT = :formatId
  WHERE ID_FEE = :feeId
    AND IS_DELETED = 0
`;

const FEE_NOT_FOUND_MESSAGE = 'No se encontró la tarifa';

//logical delete so the row stays and the purchases that used this fee keep it
const DEACTIVATE_FEE_QUERY = `
  UPDATE PI_DEVELOPERS.FEES
  SET IS_DELETED = 1
  WHERE ID_FEE = :feeId
    AND IS_DELETED = 0
`;

const FEE_BY_ID_QUERY = `
  SELECT ID_FEE
  FROM PI_DEVELOPERS.FEES
  WHERE ID_FEE = :feeId
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

async function findActiveFormatName(connection, formatId) {
  const result = await connection.execute(ACTIVE_FORMAT_NAME_QUERY, { formatId }, OBJECT_FORMAT);
  return result.rows[0]?.AUDIOVISUAL_FORMAT_NAME;
}

async function existsDuplicateFee(connection, fee, excludeFeeId = 0) {
  const result = await connection.execute(
    ACTIVE_FEE_BY_TYPE_AND_FORMAT_QUERY,
    { type: fee.type, formatId: fee.formatId, excludeFeeId },
    OBJECT_FORMAT
  );
  return result.rows.length > 0;
}

function parseFeeId(value) {
  const feeId = Number(value);
  return Number.isInteger(feeId) && feeId > 0 ? feeId : null;
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

    formatName = await findActiveFormatName(connection, fee.formatId);
    if (!formatName) {
      return res.status(400).json({ errors: { formatId: FORMAT_NOT_FOUND_MESSAGE } });
    }

    if (await existsDuplicateFee(connection, fee)) {
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

export const updateFee = async (req, res, next) => {
  const feeId = parseFeeId(req.params.id);
  if (!feeId) {
    return res.status(404).json({ message: FEE_NOT_FOUND_MESSAGE });
  }

  const { errors, fee } = validateFee(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  let connection;
  let formatName;
  try {
    connection = await getConnection();

    const existingResult = await connection.execute(ACTIVE_FEE_BY_ID_QUERY, { feeId }, OBJECT_FORMAT);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: FEE_NOT_FOUND_MESSAGE });
    }

    formatName = await findActiveFormatName(connection, fee.formatId);
    if (!formatName) {
      return res.status(400).json({ errors: { formatId: FORMAT_NOT_FOUND_MESSAGE } });
    }

    if (await existsDuplicateFee(connection, fee, feeId)) {
      return duplicateFeeResponse(res, fee.type, formatName);
    }

    await connection.execute(UPDATE_FEE_QUERY, {
      type: fee.type,
      amount: fee.amount,
      formatId: fee.formatId,
      feeId
    });
    await connection.commit();

    res.status(200).json({
      data: {
        ID_FEE: feeId,
        TYPE: fee.type,
        AMOUNT: fee.amount,
        ID_AUDIOVISUAL_FORMAT: fee.formatId,
        AUDIOVISUAL_FORMAT_NAME: formatName
      }
    });
  } catch (error) {
    if (error.errorNum === UNIQUE_CONSTRAINT_ERROR && formatName) {
      return duplicateFeeResponse(res, fee.type, formatName);
    }
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const deactivateFee = async (req, res, next) => {
  const feeId = parseFeeId(req.params.id);
  if (!feeId) {
    return res.status(404).json({ message: FEE_NOT_FOUND_MESSAGE });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(DEACTIVATE_FEE_QUERY, { feeId });
    if (result.rowsAffected === 0) {
      //already deactivated for a possible second click, not an error
      const existingResult = await connection.execute(FEE_BY_ID_QUERY, { feeId }, OBJECT_FORMAT);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ message: FEE_NOT_FOUND_MESSAGE });
      }
      return res.status(200).json({ message: 'La tarifa ya estaba desactivada' });
    }

    await connection.commit();
    res.status(200).json({ message: 'Tarifa desactivada' });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
