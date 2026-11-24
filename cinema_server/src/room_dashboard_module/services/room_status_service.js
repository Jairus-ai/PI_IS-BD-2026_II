export const ROOM_STATUS = Object.freeze({
  PLAYING: 'PLAYING',
  WAITING: 'WAITING',
  CLEANING: 'CLEANING',
  FREE: 'FREE'
});

export const SCREENING_PHASE = Object.freeze({
  FINISHED: 'FINISHED',
  IN_PROGRESS: 'IN_PROGRESS',
  UPCOMING: 'UPCOMING'
});

export const WAITING_WINDOW_MINUTES = 30;
export const MANUAL_STATUS_MINUTES = 30;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const HOURS_PER_DAY = 24;

const AUTOMATIC_STATUS_PRIORITY = [ROOM_STATUS.PLAYING, ROOM_STATUS.CLEANING, ROOM_STATUS.WAITING];

const pad = (value) => String(value).padStart(2, '0');

export function formatClock(totalSeconds) {
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR) % HOURS_PER_DAY;
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  return `${pad(hours)}:${pad(minutes)}`;
}

export function formatClockWithSeconds(totalSeconds) {
  return `${formatClock(totalSeconds)}:${pad(totalSeconds % SECONDS_PER_MINUTE)}`;
}

export function getScreeningPhase(nowSeconds, { startSeconds, endSeconds }) {
  if (nowSeconds >= endSeconds) {
    return SCREENING_PHASE.FINISHED;
  }
  return nowSeconds >= startSeconds ? SCREENING_PHASE.IN_PROGRESS : SCREENING_PHASE.UPCOMING;
}

function getStatusForScreening(nowSeconds, { startSeconds, endSeconds }, cleaningMinutes) {
  const cleaningEnd = endSeconds + cleaningMinutes * SECONDS_PER_MINUTE;
  const waitingStart = startSeconds - WAITING_WINDOW_MINUTES * SECONDS_PER_MINUTE;

  if (nowSeconds >= startSeconds && nowSeconds < endSeconds) {
    return ROOM_STATUS.PLAYING;
  }
  if (nowSeconds >= endSeconds && nowSeconds < cleaningEnd) {
    return ROOM_STATUS.CLEANING;
  }
  if (nowSeconds >= waitingStart && nowSeconds < startSeconds) {
    return ROOM_STATUS.WAITING;
  }
  return ROOM_STATUS.FREE;
}

export function calculateAutomaticStatus(nowSeconds, slots, cleaningMinutes) {
  const statuses = slots.map((slot) => getStatusForScreening(nowSeconds, slot, cleaningMinutes));
  return AUTOMATIC_STATUS_PRIORITY.find((status) => statuses.includes(status)) ?? ROOM_STATUS.FREE;
}

export function pickDefaultIndex(phases) {
  const inProgress = phases.indexOf(SCREENING_PHASE.IN_PROGRESS);
  if (inProgress !== -1) {
    return inProgress;
  }
  const upcoming = phases.indexOf(SCREENING_PHASE.UPCOMING);
  return upcoming === -1 ? phases.length - 1 : upcoming;
}

export function buildTiming(nowSeconds, slot, phase, cleaningMinutes) {
  if (!slot) {
    return null;
  }

  const cleaningEnd = slot.endSeconds + cleaningMinutes * SECONDS_PER_MINUTE;
  const hasRealClock = Number.isFinite(nowSeconds);

  return {
    minutesToStart:
      hasRealClock && phase === SCREENING_PHASE.UPCOMING
        ? Math.ceil((slot.startSeconds - nowSeconds) / SECONDS_PER_MINUTE)
        : null,
    minutesToEnd:
      hasRealClock && phase === SCREENING_PHASE.IN_PROGRESS
        ? Math.ceil((slot.endSeconds - nowSeconds) / SECONDS_PER_MINUTE)
        : null,
    cleaningStartsAt: formatClock(slot.endSeconds),
    cleaningEndsAt: formatClock(cleaningEnd)
  };
}