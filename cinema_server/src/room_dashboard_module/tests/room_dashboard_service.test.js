import { describe, expect, test } from '@jest/globals';
import { buildFilters, buildRoomDashboard } from '../services/room_dashboard_service.js';
import { ROOM_STATUS, SCREENING_PHASE } from '../services/room_status_service.js';

const at = (hours, minutes = 0, seconds = 0) => hours * 3600 + minutes * 60 + seconds;

const TODAY = '2026-11-24';
const CLOCK = { today: TODAY, nowSeconds: at(20, 3) };

const ROOM = {
  ID_SCREEN: 7,
  ROOM_NAME: 'Sala 02',
  SCREEN_TYPE: 'REG',
  AMOUNT_SEATS: 120,
  MAINTENANCE_TIME: 15,
  ADDS_TIME: 10,
  ID_LOCATION: 1,
  LOCATION_NAME: 'Sucursal Central'
};

const buildRow = (overrides) => ({
  ID_SCREENING: 1,
  MOVIE_TITLE: 'Interstellar',
  MOVIE_DURATION: 135,
  MOVIE_LANGUAGE: 'ES',
  MOVIE_FORMAT: '2D',
  GENRES: 'Ciencia ficción',
  START_SECONDS: at(15),
  END_SECONDS: at(17, 20),
  TICKETS_SOLD: 30,
  REVENUE: 90000,
  ...overrides
});

const ROWS = [
  buildRow({ ID_SCREENING: 1 }),
  buildRow({
    ID_SCREENING: 2,
    START_SECONDS: at(18, 30),
    END_SECONDS: at(20, 35),
    TICKETS_SOLD: 60,
    REVENUE: 210000
  }),
  buildRow({
    ID_SCREENING: 3,
    START_SECONDS: at(21, 15),
    END_SECONDS: at(23, 35),
    TICKETS_SOLD: 0,
    REVENUE: 0
  })
];

const build = (overrides) =>
  buildRoomDashboard({
    room: ROOM,
    clock: CLOCK,
    date: TODAY,
    screeningRows: ROWS,
    override: null,
    ...overrides
  });

describe('buildRoomDashboard - today', () => {
  test('calculates the automatic status and selects the screening in progress', () => {
    const dashboard = build();

    expect(dashboard.isToday).toBe(true);
    expect(dashboard.operationalStatus).toBe(ROOM_STATUS.PLAYING);
    expect(dashboard.statusSource).toBe('AUTO');
    expect(dashboard.manualStatus).toBeNull();
    expect(dashboard.defaultScreeningId).toBe(2);
    expect(dashboard.lastUpdated).toBe('20:03:00');
  });

  test('marks every screening with its phase', () => {
    const phases = build().screenings.map((screening) => screening.phase);
    expect(phases).toEqual([
      SCREENING_PHASE.FINISHED,
      SCREENING_PHASE.IN_PROGRESS,
      SCREENING_PHASE.UPCOMING
    ]);
  });

  test('screening KPIs: real end time, availability, occupancy and revenue', () => {
    const [, current] = build().screenings;

    expect(current).toMatchObject({
      id: 2,
      startTime: '18:30',
      endTime: '20:45',
      ticketsSold: 60,
      ticketsAvailable: 60,
      occupancyPercent: 50,
      revenue: 210000
    });
  });

  test('day summary adds every screening of the room', () => {
    expect(build().daySummary).toEqual({
      screeningsCount: 3,
      ticketsSold: 90,
      revenue: 300000,
      averageTicket: 3333.33
    });
  });

  test('timing of the selected screening', () => {
    expect(build().timing).toEqual({
      minutesToStart: null,
      minutesToEnd: 42,
      cleaningStartsAt: '20:45',
      cleaningEndsAt: '21:00'
    });
  });

  test('an active manual status overrides the automatic one', () => {
    const dashboard = build({ override: { OVERRIDE_STATUS: ROOM_STATUS.CLEANING, EXPIRES_AT: '20:33' } });

    expect(dashboard.operationalStatus).toBe(ROOM_STATUS.CLEANING);
    expect(dashboard.statusSource).toBe('MANUAL');
    expect(dashboard.manualStatus).toEqual({ status: ROOM_STATUS.CLEANING, expiresAt: '20:33' });
  });

  test('waiting window before the first screening', () => {
    const dashboard = build({ clock: { today: TODAY, nowSeconds: at(14, 35) } });

    expect(dashboard.operationalStatus).toBe(ROOM_STATUS.WAITING);
    expect(dashboard.defaultScreeningId).toBe(1);
  });
});

describe('buildRoomDashboard - other dates', () => {
  test('past date: no operational status, all finished, last screening selected', () => {
    const dashboard = build({ date: '2026-11-23' });

    expect(dashboard.isToday).toBe(false);
    expect(dashboard.operationalStatus).toBeNull();
    expect(dashboard.statusSource).toBeNull();
    expect(dashboard.screenings.every((s) => s.phase === SCREENING_PHASE.FINISHED)).toBe(true);
    expect(dashboard.defaultScreeningId).toBe(3);
    expect(dashboard.timing.minutesToEnd).toBeNull();
  });

  test('future date: all upcoming, first screening selected', () => {
    const dashboard = build({ date: '2026-11-25' });

    expect(dashboard.operationalStatus).toBeNull();
    expect(dashboard.screenings.every((s) => s.phase === SCREENING_PHASE.UPCOMING)).toBe(true);
    expect(dashboard.defaultScreeningId).toBe(1);
    expect(dashboard.timing.minutesToStart).toBeNull();
  });

  test('a manual status is ignored when the date is not today', () => {
    const dashboard = build({
      date: '2026-11-25',
      override: { OVERRIDE_STATUS: ROOM_STATUS.CLEANING, EXPIRES_AT: '20:33' }
    });
    expect(dashboard.manualStatus).toBeNull();
  });
});

describe('buildRoomDashboard - edge cases', () => {
  test('room without screenings', () => {
    const dashboard = build({ screeningRows: [] });

    expect(dashboard.screenings).toEqual([]);
    expect(dashboard.defaultScreeningId).toBeNull();
    expect(dashboard.timing).toBeNull();
    expect(dashboard.operationalStatus).toBe(ROOM_STATUS.FREE);
    expect(dashboard.daySummary).toEqual({
      screeningsCount: 0,
      ticketsSold: 0,
      revenue: 0,
      averageTicket: 0
    });
  });

  test('occupancy is rounded to one decimal', () => {
    const [screening] = build({ screeningRows: [buildRow({ TICKETS_SOLD: 1 })] }).screenings;
    expect(screening.occupancyPercent).toBe(0.8);
  });

  test('available seats never go below zero', () => {
    const [screening] = build({ screeningRows: [buildRow({ TICKETS_SOLD: 130 })] }).screenings;
    expect(screening.ticketsAvailable).toBe(0);
  });
});

describe('buildFilters', () => {
  const rooms = [
    { ID_SCREEN: 1, ROOM_NAME: 'Sala 01', SCREEN_TYPE: 'REG', AMOUNT_SEATS: 100, ID_LOCATION: 1, LOCATION_NAME: 'Central' },
    { ID_SCREEN: 2, ROOM_NAME: 'Sala 02', SCREEN_TYPE: 'VIP', AMOUNT_SEATS: 40, ID_LOCATION: 1, LOCATION_NAME: 'Central' },
    { ID_SCREEN: 3, ROOM_NAME: 'Sala 01', SCREEN_TYPE: 'REG', AMOUNT_SEATS: 80, ID_LOCATION: 2, LOCATION_NAME: 'Norte' }
  ];

  test('derives unique locations from the rooms', () => {
    expect(buildFilters(rooms).locations).toEqual([
      { id: 1, name: 'Central' },
      { id: 2, name: 'Norte' }
    ]);
  });

  test('maps every room with its location id', () => {
    expect(buildFilters(rooms).rooms[1]).toEqual({
      id: 2,
      name: 'Sala 02',
      type: 'VIP',
      capacity: 40,
      locationId: 1,
      locationName: 'Central'
    });
  });

  test('no accessible rooms gives empty lists', () => {
    expect(buildFilters([])).toEqual({ locations: [], rooms: [] });
  });
});