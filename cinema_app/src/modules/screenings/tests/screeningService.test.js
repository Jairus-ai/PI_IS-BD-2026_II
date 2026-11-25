import { jest } from '@jest/globals';

const mockGet = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
  api: { get: mockGet },
}));

const { getScreeningsByMovie } = await import('../services/screeningService');

describe('screeningService', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('requests the movie screenings without a location filter', async () => {
    mockGet.mockResolvedValue({ data: { data: [] } });

    const result = await getScreeningsByMovie(7);

    expect(mockGet).toHaveBeenCalledWith('/screenings/movie/7', { params: undefined });
    expect(result).toEqual({ data: [] });
  });

  it('sends idLocation as a query param when provided', async () => {
    mockGet.mockResolvedValue({ data: { data: [] } });

    await getScreeningsByMovie(7, 3);

    expect(mockGet).toHaveBeenCalledWith('/screenings/movie/7', { params: { idLocation: 3 } });
  });
});