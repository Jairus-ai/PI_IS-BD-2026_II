export type RoomStatus = 'PLAYING' | 'WAITING' | 'CLEANING' | 'FREE';
export type ScreeningPhase = 'FINISHED' | 'IN_PROGRESS' | 'UPCOMING';
export type StatusSource = 'AUTO' | 'MANUAL';

export interface RoomLocation {
  id: number;
  name: string;
}

export interface RoomOption {
  id: number;
  name: string;
  type: string;
  capacity: number;
  locationId: number;
  locationName: string;
}

export interface RoomDashboardFilters {
  locations: RoomLocation[];
  rooms: RoomOption[];
}

export interface RoomScreening {
  id: number;
  movieTitle: string;
  poster: string | null;
  genres: string | null;
  durationMinutes: number;
  language: string;
  format: string;
  startTime: string;
  endTime: string;
  phase: ScreeningPhase;
  ticketsSold: number;
  ticketsAvailable: number;
  occupancyPercent: number;
  revenue: number;
}

export interface RoomTiming {
  minutesToStart: number | null;
  minutesToEnd: number | null;
  cleaningStartsAt: string;
  cleaningEndsAt: string;
}

export interface ManualStatus {
  status: RoomStatus;
  expiresAt: string;
}

export interface DaySummary {
  screeningsCount: number;
  ticketsSold: number;
  revenue: number;
  averageTicket: number;
}

export interface RoomDashboard {
  room: RoomOption;
  date: string;
  isToday: boolean;
  lastUpdated: string;
  operationalStatus: RoomStatus | null;
  statusSource: StatusSource | null;
  manualStatus: ManualStatus | null;
  defaultScreeningId: number | null;
  timing: RoomTiming | null;
  screenings: RoomScreening[];
  daySummary: DaySummary;
}

export const MANUAL_STATUS_OPTIONS: RoomStatus[] = ['PLAYING', 'WAITING', 'CLEANING', 'FREE'];

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  PLAYING: 'Proyectando',
  WAITING: 'En espera',
  CLEANING: 'En limpieza',
  FREE: 'Libre'
};

export const ROOM_STATUS_COLORS: Record<RoomStatus, 'success' | 'warning' | 'info' | 'default'> = {
  PLAYING: 'success',
  WAITING: 'warning',
  CLEANING: 'info',
  FREE: 'default'
};

export const SCREENING_PHASE_LABELS: Record<ScreeningPhase, string> = {
  FINISHED: 'Finalizada',
  IN_PROGRESS: 'En curso',
  UPCOMING: 'Próxima'
};

export const SCREENING_PHASE_COLORS: Record<ScreeningPhase, 'success' | 'info' | 'default'> = {
  FINISHED: 'default',
  IN_PROGRESS: 'success',
  UPCOMING: 'info'
};