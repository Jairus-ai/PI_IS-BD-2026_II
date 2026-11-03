import dayjs from 'dayjs';
import { FEE_TYPE_LABELS, formatFeeAmount, type FeeType } from '../../fees/types/fees';

export interface Purchase {
  ID_RECEIPT: number;
  TOTAL_AMOUNT: number;
  RECEIPT_DATE: string;
  MOVIE_TITLE: string | null;
}
export interface PurchaseSeat {
  SEAT_ROW: string;
  SEAT_NUMBER: number;
  FEE_TYPE: FeeType;
  AMOUNT: number;
}
export interface PurchaseSnack {
  SNACK_NAME: string;
  QUANTITY: number;
  UNIT_PRICE: number;
}
export interface PurchaseDiscount {
  DISCOUNT_NAME: string;
  DISCOUNT_AMOUNT: number;
}
export interface PurchaseDetail extends Purchase {
  LOCATION_NAME: string | null;
  SCREENING_DATE: string | null;
  IS_REFUNDED: boolean;
  SEATS: PurchaseSeat[];
  SNACKS: PurchaseSnack[];
  DISCOUNTS: PurchaseDiscount[];
}
const DATE_TIME_FORMAT = 'DD/MM/YYYY HH:mm';
const NOT_AVAILABLE = 'No disponible';

export const formatAmount = formatFeeAmount;
export function formatDateTime(value: string | null): string {
  return value ? dayjs(value).format(DATE_TIME_FORMAT) : NOT_AVAILABLE;
}
export function getMovieTitle(purchase: Purchase): string {
  return purchase.MOVIE_TITLE ?? NOT_AVAILABLE;
}
export function getSeatName(seat: PurchaseSeat): string {
  return `${seat.SEAT_ROW}${seat.SEAT_NUMBER}`;
}
export function getSeatFee(seat: PurchaseSeat): string {
  return `${getSeatName(seat)}: ${FEE_TYPE_LABELS[seat.FEE_TYPE]} (${formatAmount(seat.AMOUNT)})`;
}
export function getSnackLine(snack: PurchaseSnack): string {
  return `${snack.QUANTITY} × ${snack.SNACK_NAME} (${formatAmount(snack.QUANTITY * snack.UNIT_PRICE)})`;
}
export function getDiscountLine(discount: PurchaseDiscount): string {
  return `${discount.DISCOUNT_NAME} (-${formatAmount(discount.DISCOUNT_AMOUNT)})`;
}
