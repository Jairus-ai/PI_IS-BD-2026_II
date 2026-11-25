import type { RoomTiming, ScreeningPhase } from '../types/roomDashboard';

const MINUTES_PER_HOUR = 60;

const COLONES_FORMATTER = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const PERCENT_FORMATTER = new Intl.NumberFormat('es-CR', { maximumFractionDigits: 1 });

export function formatColones(amount: number): string {
  return `₡${COLONES_FORMATTER.format(amount)}`;
}

export function formatPercent(value: number): string {
  return `${PERCENT_FORMATTER.format(value)}%`;
}

export function formatSeats(count: number): string {
  return `${count} ${count === 1 ? 'asiento' : 'asientos'}`;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;

  if (hours === 0) {
    return `${minutes} min`;
  }
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, '0')} min`;
}


export function buildTimingHint(timing: RoomTiming | null, phase: ScreeningPhase): string | null {
  if (!timing) {
    return null;
  }
  if (phase === 'IN_PROGRESS' && timing.minutesToEnd !== null) {
    return `Termina en ${formatDuration(timing.minutesToEnd)} · Limpieza a las ${timing.cleaningStartsAt}`;
  }
  if (phase === 'UPCOMING' && timing.minutesToStart !== null) {
    return `Empieza en ${formatDuration(timing.minutesToStart)} · Limpieza a las ${timing.cleaningStartsAt}`;
  }
  return null;
}