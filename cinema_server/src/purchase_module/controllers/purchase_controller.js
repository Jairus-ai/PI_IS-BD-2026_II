import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';

const PAID_STATUS = 'PAID';
const PURCHASE_NOT_FOUND_MESSAGE = 'No se encontró la compra';
const OBJECT_FORMAT = { outFormat: oracledb.OUT_FORMAT_OBJECT };

//seat-screening-billboard-movie, the movie of a purchase comes from its seats
const PURCHASE_HISTORY_QUERY = `
  SELECT
    r.ID_RECEIPT,
    r.TOTAL_AMOUNT,
    TO_CHAR(r.RECEIPT_DATE, 'YYYY-MM-DD"T"HH24:MI') AS RECEIPT_DATE,
    MIN(m.MOVIE_TITLE) AS MOVIE_TITLE
  FROM PI_DEVELOPERS.RECEIPTS r
    LEFT JOIN PI_DEVELOPERS.SEAT_RECEIPTS sr ON sr.ID_RECEIPT = r.ID_RECEIPT
    LEFT JOIN PI_DEVELOPERS.SCREENINGS s ON s.ID_SCREENING = sr.ID_SCREENING
    LEFT JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = s.ID_MOVIE_IN_BILLBOARD
    LEFT JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
  WHERE r.ID_CLIENT = :clientId
    AND r.STATUS = :status
  GROUP BY r.ID_RECEIPT, r.TOTAL_AMOUNT, r.RECEIPT_DATE
  ORDER BY r.RECEIPT_DATE DESC
`;

const PURCHASE_SUMMARY_QUERY = `
  SELECT
    r.ID_RECEIPT,
    r.TOTAL_AMOUNT,
    TO_CHAR(r.RECEIPT_DATE, 'YYYY-MM-DD"T"HH24:MI') AS RECEIPT_DATE,
    m.MOVIE_TITLE,
    l.LOCATION_NAME,
    TO_CHAR(s.SCREENING_DATE + s.SCREENING_START_TIME, 'YYYY-MM-DD"T"HH24:MI') AS SCREENING_DATE,
    CASE WHEN rf.ID_REFUND IS NULL THEN 0 ELSE 1 END AS IS_REFUNDED
  FROM PI_DEVELOPERS.RECEIPTS r
    LEFT JOIN PI_DEVELOPERS.SEAT_RECEIPTS sr ON sr.ID_RECEIPT = r.ID_RECEIPT
    LEFT JOIN PI_DEVELOPERS.SCREENINGS s ON s.ID_SCREENING = sr.ID_SCREENING
    LEFT JOIN PI_DEVELOPERS.SCREENS sc ON sc.ID_SCREEN = s.ID_SCREEN
    LEFT JOIN PI_DEVELOPERS.LOCATIONS l ON l.ID_LOCATION = sc.ID_LOCATION
    LEFT JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = s.ID_MOVIE_IN_BILLBOARD
    LEFT JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
    LEFT JOIN PI_DEVELOPERS.REFUNDS rf ON rf.ID_RECEIPT = r.ID_RECEIPT
  WHERE r.ID_RECEIPT = :purchaseId
    AND r.ID_CLIENT = :clientId
    AND r.STATUS = :status
  FETCH FIRST 1 ROWS ONLY
`;

const PURCHASE_SEATS_QUERY = `
  SELECT
    st.SEAT_ROW,
    st.SEAT_NUMBER,
    f.TYPE AS FEE_TYPE,
    sr.AMOUNT
  FROM PI_DEVELOPERS.SEAT_RECEIPTS sr
    JOIN PI_DEVELOPERS.SEATS st
      ON st.ID_SEAT = sr.ID_SEAT AND st.ID_SCREEN = sr.ID_SCREEN AND st.ID_SCREENING = sr.ID_SCREENING
    JOIN PI_DEVELOPERS.FEES f ON f.ID_FEE = sr.ID_FEE
  WHERE sr.ID_RECEIPT = :purchaseId
  ORDER BY st.SEAT_ROW, st.SEAT_NUMBER
`;

const PURCHASE_SNACKS_QUERY = `
  SELECT sn.SNACK_NAME, snr.QUANTITY, snr.UNIT_PRICE
  FROM PI_DEVELOPERS.SNACK_RECEIPTS snr
    JOIN PI_DEVELOPERS.SNACKS sn ON sn.ID_SNACK = snr.ID_SNACK
  WHERE snr.ID_RECEIPT = :purchaseId
  ORDER BY sn.SNACK_NAME
`;

const PURCHASE_DISCOUNTS_QUERY = `
  SELECT d.DISCOUNT_NAME, rd.DISCOUNT_AMOUNT
  FROM PI_DEVELOPERS.RECEIPT_DISCOUNTS rd
    JOIN PI_DEVELOPERS.DISCOUNTS d ON d.ID_DISCOUNT = rd.ID_DISCOUNT
  WHERE rd.ID_RECEIPT = :purchaseId
`;

function parsePurchaseId(value) {
  const purchaseId = Number(value);
  return Number.isInteger(purchaseId) && purchaseId > 0 ? purchaseId : null;
}

export const getPurchaseHistory = async (req, res, next) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      PURCHASE_HISTORY_QUERY,
      { clientId: req.user.id, status: PAID_STATUS },
      OBJECT_FORMAT
    );
    res.status(200).json({ data: result.rows });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};

export const getPurchaseDetail = async (req, res, next) => {
  const purchaseId = parsePurchaseId(req.params.id);
  if (!purchaseId) {
    return res.status(404).json({ message: PURCHASE_NOT_FOUND_MESSAGE });
  }

  let connection;
  try {
    connection = await getConnection();
    //session filter keeps other clients purchases hidden
    const summaryResult = await connection.execute(
      PURCHASE_SUMMARY_QUERY,
      { purchaseId, clientId: req.user.id, status: PAID_STATUS },
      OBJECT_FORMAT
    );
    const summary = summaryResult.rows[0];
    if (!summary) {
      return res.status(404).json({ message: PURCHASE_NOT_FOUND_MESSAGE });
    }

    const binds = { purchaseId };
    const seatsResult = await connection.execute(PURCHASE_SEATS_QUERY, binds, OBJECT_FORMAT);
    const snacksResult = await connection.execute(PURCHASE_SNACKS_QUERY, binds, OBJECT_FORMAT);
    const discountsResult = await connection.execute(PURCHASE_DISCOUNTS_QUERY, binds, OBJECT_FORMAT);

    res.status(200).json({
      data: {
        ...summary,
        IS_REFUNDED: summary.IS_REFUNDED === 1,
        SEATS: seatsResult.rows,
        SNACKS: snacksResult.rows,
        DISCOUNTS: discountsResult.rows
      }
    });
  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
