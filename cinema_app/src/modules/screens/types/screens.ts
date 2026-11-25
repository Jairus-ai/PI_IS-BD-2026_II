export type ScreenType = 'REG' | 'VIP' | 'IMAX' | '4DX';

export interface Screen {
  ID_SCREEN: number;
  SCREEN_NUMBER: number;
  SCREEN_NAME: string;
  SCREEN_TYPE: ScreenType;
  AMOUNT_ROWS: number;
  AMOUNT_SEATS_PER_ROWS: number;
  AMOUNT_SEATS: number;
  MAINTENANCE_TIME: number;
  ADDS_TIME: number;
  ID_LOCATION: number;
  LOCATION_NAME: string;
}

export interface ScreenLocation {
  ID_LOCATION: number;
  LOCATION_NAME: string;
}

export const SCREEN_TYPE_LABELS: Record<ScreenType, string> = {
  REG: 'Regular',
  VIP: 'VIP',
  IMAX: 'IMAX',
  '4DX': '4DX'
};

export function getScreenTitle(screen: Screen): string {
  return `${screen.SCREEN_NAME} - ${screen.LOCATION_NAME}`;
}

export function formatMinutes(minutes: number): string {
  return `${minutes} min`;
}
