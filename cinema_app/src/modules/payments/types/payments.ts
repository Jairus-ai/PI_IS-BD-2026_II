export interface PaymentSeat {
  id: number;
  row: string;
  number: number;
}

export interface PaymentReservation {
  screeningId: number;
  reservedUntil: string;
  seats: PaymentSeat[];
}

export interface PaymentRequest {
  feeId: number;
  seatPrice: number;
}

export interface PaymentIntentResponse {
  sessionId: string;
  url: string;
  expiresAt: string;
}

export type PaymentStatus = 'PAID' | 'REJECTED' | 'PENDING';
