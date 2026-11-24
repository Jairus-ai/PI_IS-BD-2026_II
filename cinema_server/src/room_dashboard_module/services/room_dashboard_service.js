import {
  buildTiming,
  calculateAutomaticStatus,
  formatClock,
  formatClockWithSeconds,
  getScreeningPhase,
  pickDefaultIndex
} from './room_status_service.js';

const SECONDS_PER_MINUTE = 60;

const round = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

function toRoomDto(room) {
  return {
    id: room.ID_SCREEN,
    name: room.ROOM_NAME,
    type: room.SCREEN_TYPE,
    capacity: room.AMOUNT_SEATS,
    locationId: room.ID_LOCATION,
    locationName: room.LOCATION_NAME
  };
}

export function buildFilters(rooms) {
  const locations = new Map();
  for (const room of rooms) {
    locations.set(room.ID_LOCATION, { id: room.ID_LOCATION, name: room.LOCATION_NAME });
  }
  return { locations: [...locations.values()], rooms: rooms.map(toRoomDto) };
}

function toSlot(row, room) {
  return {
    startSeconds: row.START_SECONDS,
    endSeconds: row.END_SECONDS + room.ADDS_TIME * SECONDS_PER_MINUTE
  };
}

function toScreeningDto(row, slot, phase, capacity) {
  return {
    id: row.ID_SCREENING,
    movieTitle: row.MOVIE_TITLE,
    genres: row.GENRES,
    durationMinutes: row.MOVIE_DURATION,
    language: row.MOVIE_LANGUAGE,
    format: row.MOVIE_FORMAT,
    startTime: formatClock(slot.startSeconds),
    endTime: formatClock(slot.endSeconds),
    phase,
    ticketsSold: row.TICKETS_SOLD,
    ticketsAvailable: Math.max(capacity - row.TICKETS_SOLD, 0),
    occupancyPercent: round((row.TICKETS_SOLD / capacity) * 100, 1),
    revenue: row.REVENUE
  };
}

function buildDaySummary(screeningRows) {
  const ticketsSold = screeningRows.reduce((total, row) => total + row.TICKETS_SOLD, 0);
  const revenue = screeningRows.reduce((total, row) => total + row.REVENUE, 0);

  return {
    screeningsCount: screeningRows.length,
    ticketsSold,
    revenue,
    averageTicket: ticketsSold > 0 ? round(revenue / ticketsSold, 2) : 0
  };
}

function resolveNowSeconds(date, clock) {
  if (date < clock.today) {
    return Infinity;
  }
  return date > clock.today ? -Infinity : clock.nowSeconds;
}

function resolveOperationalStatus({ isToday, nowSeconds, slots, room, override }) {
  if (!isToday) {
    return { operationalStatus: null, statusSource: null, manualStatus: null };
  }
  if (override) {
    return {
      operationalStatus: override.OVERRIDE_STATUS,
      statusSource: 'MANUAL',
      manualStatus: { status: override.OVERRIDE_STATUS, expiresAt: override.EXPIRES_AT }
    };
  }
  return {
    operationalStatus: calculateAutomaticStatus(nowSeconds, slots, room.MAINTENANCE_TIME),
    statusSource: 'AUTO',
    manualStatus: null
  };
}

export function buildRoomDashboard({ room, clock, date, screeningRows, override }) {
  const isToday = date === clock.today;
  const nowSeconds = resolveNowSeconds(date, clock);
  const capacity = room.AMOUNT_SEATS;

  const slots = screeningRows.map((row) => toSlot(row, room));
  const phases = slots.map((slot) => getScreeningPhase(nowSeconds, slot));
  const screenings = screeningRows.map((row, index) =>
    toScreeningDto(row, slots[index], phases[index], capacity)
  );

  const defaultIndex = pickDefaultIndex(phases);

  return {
    room: toRoomDto(room),
    date,
    isToday,
    lastUpdated: formatClockWithSeconds(clock.nowSeconds),
    ...resolveOperationalStatus({ isToday, nowSeconds, slots, room, override }),
    defaultScreeningId: screenings[defaultIndex]?.id ?? null,
    timing: buildTiming(nowSeconds, slots[defaultIndex], phases[defaultIndex], room.MAINTENANCE_TIME),
    screenings,
    daySummary: buildDaySummary(screeningRows)
  };
}