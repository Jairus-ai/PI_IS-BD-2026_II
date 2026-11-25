import type { FeeType } from '../../fees/types/fees';

export interface SummaryTicket {
  seatId: number;
  seat: string;
  feeType: FeeType;
  price: number;
}

export interface SummarySnack {
  snackId: number;
  name: string;
  quantity: number;
  amount: number;
}

export interface SummaryDiscount {
  discountId: number;
  name: string;
  amount: number;
}

export interface PurchaseSummary {
  screeningId: number;
  reservedUntil: string;
  movieTitle: string;
  locationName: string;
  screenName: string;
  screenType: string;
  movieFormat: string;
  screeningDate: string;
  purchaseDate: string;
  ticketCount: number;
  tickets: SummaryTicket[];
  snacks: SummarySnack[];
  discounts: SummaryDiscount[];
  subtotal: number;
  total: number;
}

export interface PaymentIntentResponse {
  sessionId: string;
  url: string;
  expiresAt: string;
}

export type PaymentStatus = 'PAID' | 'REJECTED' | 'PENDING';
