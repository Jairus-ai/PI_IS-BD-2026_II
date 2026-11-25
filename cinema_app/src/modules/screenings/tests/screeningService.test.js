import { describe, expect, jest, test } from '@jest/globals';

const mockGet = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
  api: { get: mockGet }
}));

const {
  getScreening,
  getScreeningsCount,
  getScreeningsList
} = await import('../services/screeningService');

describe('screeningService', () => {
  test('Returns the total, the page and the detail', async () => {
    mockGet
      .mockResolvedValueOnce({ data: { total: 3 } })
      .mockResolvedValueOnce({ data: { data: [] } })
      .mockResolvedValueOnce({ data: { data: { ID_SCREENING: 21 } } });

    expect(await getScreeningsCount()).toBe(3);
    expect(await getScreeningsList()).toEqual({ data: [] });
    expect(await getScreening(21)).toEqual({ ID_SCREENING: 21 });
  });
});
