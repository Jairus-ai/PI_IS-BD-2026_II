export type FeeType = 'G' | 'N' | 'E' | 'M';

export interface Fee {
  ID_FEE: number;
  TYPE: FeeType;
  AMOUNT: number;
  ID_AUDIOVISUAL_FORMAT: number;
  AUDIOVISUAL_FORMAT_NAME: string;
}

export const FEE_TYPE_LABELS: Record<FeeType, string> = {
  G: 'General',
  N: 'Niño',
  E: 'Estudiante',
  M: 'Adulto mayor'
};

const AMOUNT_FORMATTER = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 2
});

export function formatFeeAmount(amount: number): string {
  return AMOUNT_FORMATTER.format(amount);
}

export function getFeeName(fee: Fee): string {
  return `${FEE_TYPE_LABELS[fee.TYPE]} - ${fee.AUDIOVISUAL_FORMAT_NAME}`;
}
