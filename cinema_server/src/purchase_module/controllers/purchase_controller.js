import oracledb from 'oracledb';
import { getConnection, closeDatabaseConnection } from '../../database/database.js';
import { getStripe } from '../../payment_module/controllers/payment_controller.js';

const PURCHASE_NOT_FOUND_MESSAGE = 'No se encontró la compra';
const OBJECT_FORMAT = { outFormat: oracledb.OUT_FORMAT_OBJECT };

const PURCHASE_HISTORY_QUERY = `
  SELECT
    r.ID_RECEIPT,
    r.TOTAL_AMOUNT,
    TO_CHAR(r.RECEIPT_DATE, 'YYYY-MM-DD"T"HH24:MI') AS RECEIPT_DATE,
    MIN(m.MOVIE_TITLE) AS MOVIE_TITLE,
    TO_CHAR(MIN(s.SCREENING_DATE + s.SCREENING_START_TIME), 'YYYY-MM-DD"T"HH24:MI') AS SCREENING_DATE,
    CASE WHEN rf.ID_REFUND IS NULL
      THEN 0
      ELSE 1
    END AS IS_REFUNDED,
    CASE
      WHEN MIN(s.SCREENING_DATE + s.SCREENING_START_TIME) >= LOCALTIMESTAMP + :minimumDays
      THEN 1
      ELSE 0
    END AS IS_REFUND_ON_TIME
  FROM PI_DEVELOPERS.RECEIPTS r
    LEFT JOIN PI_DEVELOPERS.SEAT_RECEIPTS sr ON sr.ID_RECEIPT = r.ID_RECEIPT
    LEFT JOIN PI_DEVELOPERS.SCREENINGS s ON s.ID_SCREENING = sr.ID_SCREENING
    LEFT JOIN PI_DEVELOPERS.MOVIES_IN_BILLBOARDS mib ON mib.ID_MOVIE_IN_BILLBOARD = s.ID_MOVIE_IN_BILLBOARD
    LEFT JOIN PI_DEVELOPERS.MOVIES m ON m.ID_MOVIE = mib.ID_MOVIE
    LEFT JOIN PI_DEVELOPERS.REFUNDS rf ON rf.ID_RECEIPT = r.ID_RECEIPT
  WHERE r.ID_CLIENT = :clientId
  GROUP BY r.ID_RECEIPT, r.TOTAL_AMOUNT, r.RECEIPT_DATE, rf.ID_REFUND
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
  FETCH FIRST 1 ROWS ONLY
`;

    const summaryResult = await connection.execute(
      summaryRequest,
      {
        purchaseId,
        clientId: req.user.id
      },
      OBJECT_FORMAT
    );

    const summary = summaryResult.rows[0];
    if (!summary) {
      return res.status(404).json({ message: PURCHASE_NOT_FOUND_MESSAGE });
    }


    const purchaseSeatsRequest = `
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
      ORDER BY st.SEAT_ROW, st.SEAT_NUMBER`;

    const purchaseSnacksRequest = `
      SELECT sn.SNACK_NAME, snr.QUANTITY, snr.UNIT_PRICE
      FROM PI_DEVELOPERS.SNACK_RECEIPTS snr
        JOIN PI_DEVELOPERS.SNACKS sn ON sn.ID_SNACK = snr.ID_SNACK
      WHERE snr.ID_RECEIPT = :purchaseId
      ORDER BY sn.SNACK_NAME`;

const PURCHASE_DISCOUNTS_QUERY = `
  SELECT d.DISCOUNT_NAME, rd.DISCOUNT_AMOUNT
  FROM PI_DEVELOPERS.RECEIPT_DISCOUNTS rd
    JOIN PI_DEVELOPERS.DISCOUNTS d ON d.ID_DISCOUNT = rd.ID_DISCOUNT
  WHERE rd.ID_RECEIPT = :purchaseId
`;

const REFUND_MINIMUM_DAYS = 5;

const REFUND_ALREADY_DONE_CODE = 'REFUND_ALREADY_DONE';
const REFUND_ALREADY_DONE_MESSAGE = 'Esta compra ya fue reembolsada';

const REFUND_TOO_LATE_CODE = 'REFUND_TOO_LATE';
const REFUND_TOO_LATE_MESSAGE = `Solo se puede reembolsar una compra con al menos ${REFUND_MINIMUM_DAYS} días de anticipación a la función`;

const RECEIPT_QUERY = `
  SELECT ID_STRIPE_PAYMENT_INTENT
  FROM PI_DEVELOPERS.RECEIPTS
  WHERE ID_RECEIPT = :purchaseId
    AND ID_CLIENT = :clientId
  FOR UPDATE
`;

const RECEIPT_REFUNDS_QUERY = `
  SELECT COUNT(*) AS REFUNDS
  FROM PI_DEVELOPERS.REFUNDS
  WHERE ID_RECEIPT = :purchaseId
`;

const REFUND_DEADLINE_QUERY = `
  SELECT
    CASE
      WHEN s.SCREENING_DATE + s.SCREENING_START_TIME < LOCALTIMESTAMP + :minimumDays
      THEN 1
      ELSE 0
    END AS IS_PAST_REFUND_DEADLINE
  FROM PI_DEVELOPERS.SEAT_RECEIPTS sr
    JOIN PI_DEVELOPERS.SCREENINGS s ON s.ID_SCREENING = sr.ID_SCREENING
  WHERE sr.ID_RECEIPT = :purchaseId
  FETCH FIRST 1 ROWS ONLY
`;

const INSERT_REFUND_QUERY = `
  INSERT INTO PI_DEVELOPERS.REFUNDS (ID_RECEIPT)
  VALUES (:purchaseId)
  RETURNING ID_REFUND INTO :refundId
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
      {
        clientId: req.user.id,
        minimumDays: REFUND_MINIMUM_DAYS
      },
      OBJECT_FORMAT
    );
    const purchases = result.rows.map((purchase) => ({
      ...purchase,
      IS_REFUNDED: purchase.IS_REFUNDED === 1,
      IS_REFUND_ON_TIME: purchase.IS_REFUND_ON_TIME === 1
    }));

    res.status(200).json({ data: purchases });
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
      { purchaseId, clientId: req.user.id },
      OBJECT_FORMAT
    );

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

export const refundPurchase = async (req, res, next) => {
  const purchaseId = parsePurchaseId(req.params.id);

  if (!purchaseId)
    return res.status(404).json({ message: PURCHASE_NOT_FOUND_MESSAGE });

  let connection;

  try {
    connection = await getConnection();

    // Get receipt
    const receiptResult = await connection.execute(
      RECEIPT_QUERY,
      {
        purchaseId,
        clientId: req.user.id
      },
      OBJECT_FORMAT
    );
    const receipt = receiptResult.rows[0];

    if (!receipt)
      return res.status(404).json({ message: PURCHASE_NOT_FOUND_MESSAGE });

    // Check if it has already been refunded
    const refundsResult = await connection.execute(
      RECEIPT_REFUNDS_QUERY,
      { purchaseId },
      OBJECT_FORMAT
    );

    if (refundsResult.rows[0].REFUNDS > 0) {
      return res.status(409).json({
        code: REFUND_ALREADY_DONE_CODE,
        message: REFUND_ALREADY_DONE_MESSAGE
      });
    }

    // Check if it can get refunded (must be more that 5 days apart from the screening)
    const deadlineResult = await connection.execute(
      REFUND_DEADLINE_QUERY,
      {
        purchaseId,
        minimumDays: REFUND_MINIMUM_DAYS
      },
      OBJECT_FORMAT
    );

    if (deadlineResult.rows[0]?.IS_PAST_REFUND_DEADLINE === 1) {
      return res.status(422).json({
        code: REFUND_TOO_LATE_CODE,
        message: REFUND_TOO_LATE_MESSAGE
      });
    }

    // Do the refund
    const refundResult = await connection.execute(
      INSERT_REFUND_QUERY,
      {
        purchaseId,
        refundId: {
          dir: oracledb.BIND_OUT,
          type: oracledb.NUMBER
        }
      }
    );

    await getStripe().refunds.create(
      { payment_intent: receipt.ID_STRIPE_PAYMENT_INTENT },
      { idempotencyKey: `refund-receipt-${purchaseId}` }
    );
    await connection.commit();

    res.status(201).json({
      data: {
        ID_REFUND: refundResult.outBinds.refundId[0],
        ID_RECEIPT: purchaseId
      }
    });

  } catch (error) {
    next(error);
  } finally {
    await closeDatabaseConnection(connection);
  }
};
