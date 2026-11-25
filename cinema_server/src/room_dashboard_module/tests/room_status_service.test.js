import { describe, expect, test } from '@jest/globals';
import {
  ROOM_STATUS,
  SCREENING_PHASE,
  buildTiming,
  calculateAutomaticStatus,
  formatClock,
  formatClockWithSeconds,
  getScreeningPhase,
  pickDefaultIndex
} from '../services/room_status_service.js';

const at = (hours, minutes = 0, seconds = 0) => hours * 3600 + minutes * 60 + seconds;

const CLEANING_MINUTES = 15;
const SLOT = { startSeconds: at(18, 30), endSeconds: at(20, 45) };

describe('formatClock', () => {
  test('formats seconds as HH:MM', () => {
    expect(formatClock(at(20, 45))).toBe('20:45');
    expect(formatClock(at(7, 5))).toBe('07:05');
    expect(formatClock(0)).toBe('00:00');
  });

  test('wraps past midnight', () => {
    expect(formatClock(at(24, 10))).toBe('00:10');
  });

  test('formats HH:MM:SS', () => {
    expect(formatClockWithSeconds(at(20, 2, 15))).toBe('20:02:15');
  });
});

describe('getScreeningPhase', () => {
  test.each([
    [at(18, 29, 59), SCREENING_PHASE.UPCOMING],
    [at(18, 30), SCREENING_PHASE.IN_PROGRESS],
    [at(20, 44, 59), SCREENING_PHASE.IN_PROGRESS],
    [at(20, 45), SCREENING_PHASE.FINISHED]
  ])('now=%i -> %s', (now, expected) => {
    expect(getScreeningPhase(now, SLOT)).toBe(expected);
  });

  test('past dates are finished and future dates are upcoming', () => {
    expect(getScreeningPhase(Infinity, SLOT)).toBe(SCREENING_PHASE.FINISHED);
    expect(getScreeningPhase(-Infinity, SLOT)).toBe(SCREENING_PHASE.UPCOMING);
  });
});

describe('calculateAutomaticStatus', () => {
  test.each([
    ['one second before the waiting window', at(17, 59, 59), ROOM_STATUS.FREE],
    ['start of the waiting window', at(18, 0), ROOM_STATUS.WAITING],
    ['last second before the screening', at(18, 29, 59), ROOM_STATUS.WAITING],
    ['screening starts', at(18, 30), ROOM_STATUS.PLAYING],
    ['last second of the screening', at(20, 44, 59), ROOM_STATUS.PLAYING],
    ['screening ends', at(20, 45), ROOM_STATUS.CLEANING],
    ['last second of cleaning', at(20, 59, 59), ROOM_STATUS.CLEANING],
    ['cleaning is over', at(21, 0), ROOM_STATUS.FREE]
  ])('%s', (_label, now, expected) => {
    expect(calculateAutomaticStatus(now, [SLOT], CLEANING_MINUTES)).toBe(expected);
  });

  test('a room without screenings is free', () => {
    expect(calculateAutomaticStatus(at(12), [], CLEANING_MINUTES)).toBe(ROOM_STATUS.FREE);
  });

  describe('overlapping windows', () => {
    const first = { startSeconds: at(15), endSeconds: at(17) };
    const second = { startSeconds: at(17, 10), endSeconds: at(19) };

    test('cleaning wins over waiting', () => {
      expect(calculateAutomaticStatus(at(17, 5), [first, second], CLEANING_MINUTES)).toBe(
        ROOM_STATUS.CLEANING
      );
    });

    test('playing wins over cleaning', () => {
      expect(calculateAutomaticStatus(at(17, 10), [first, second], CLEANING_MINUTES)).toBe(
        ROOM_STATUS.PLAYING
      );
    });
  });

  test('uses the cleaning time of the room', () => {
    expect(calculateAutomaticStatus(at(21, 5), [SLOT], 30)).toBe(ROOM_STATUS.CLEANING);
    expect(calculateAutomaticStatus(at(21, 5), [SLOT], 10)).toBe(ROOM_STATUS.FREE);
  });
});

describe('pickDefaultIndex', () => {
  const { FINISHED, IN_PROGRESS, UPCOMING } = SCREENING_PHASE;

  test('prefers the screening in progress', () => {
    expect(pickDefaultIndex([FINISHED, IN_PROGRESS, UPCOMING])).toBe(1);
  });

  test('falls back to the first upcoming screening', () => {
    expect(pickDefaultIndex([FINISHED, FINISHED, UPCOMING, UPCOMING])).toBe(2);
  });

  test('falls back to the last screening when all are finished', () => {
    expect(pickDefaultIndex([FINISHED, FINISHED, FINISHED])).toBe(2);
  });

  test('returns -1 when there are no screenings', () => {
    expect(pickDefaultIndex([])).toBe(-1);
  });
});

describe('buildTiming', () => {
  test('screening in progress: minutes left and cleaning window', () => {
    expect(buildTiming(at(20, 3), SLOT, SCREENING_PHASE.IN_PROGRESS, CLEANING_MINUTES)).toEqual({
      minutesToStart: null,
      minutesToEnd: 42,
      cleaningStartsAt: '20:45',
      cleaningEndsAt: '21:00'
    });
  });

  test('rounds partial minutes up', () => {
    const timing = buildTiming(at(20, 3, 30), SLOT, SCREENING_PHASE.IN_PROGRESS, CLEANING_MINUTES);
    expect(timing.minutesToEnd).toBe(42);
  });

  test('upcoming screening: minutes to start', () => {
    const timing = buildTiming(at(18, 0), SLOT, SCREENING_PHASE.UPCOMING, CLEANING_MINUTES);
    expect(timing.minutesToStart).toBe(30);
    expect(timing.minutesToEnd).toBeNull();
  });

  test('no countdown for dates that are not today', () => {
    const timing = buildTiming(Infinity, SLOT, SCREENING_PHASE.FINISHED, CLEANING_MINUTES);
    expect(timing.minutesToStart).toBeNull();
    expect(timing.minutesToEnd).toBeNull();
    expect(timing.cleaningStartsAt).toBe('20:45');
  });

  test('returns null without a screening', () => {
    expect(buildTiming(at(12), undefined, SCREENING_PHASE.UPCOMING, CLEANING_MINUTES)).toBeNull();
  });
});