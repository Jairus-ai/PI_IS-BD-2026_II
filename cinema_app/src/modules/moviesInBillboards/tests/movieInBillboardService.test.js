import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
  api: {
    get: mockGet,
    post: mockPost,
    put: mockPut
  }
}));

const {
  createMovieInBillboard,
  getMovieInBillboard,
  updateMovieInBillboard,
  getMoviesInBillboardsCount,
  getMoviesInBillboardsList
} = await import('../services/movieInBillboardService');

const BASE_PATH = '/management/movies_in_billboards';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('movieInBillboardService', () => {
  test('Returns the total of movies in billboards', async () => {
    mockGet.mockResolvedValue({ data: { total: 12 } });

    expect(await getMoviesInBillboardsCount({ locationId: '3' })).toBe(12);
    expect(mockGet).toHaveBeenCalledWith(`${BASE_PATH}/count`, {
      withCredentials: true,
      params: { locationId: 3 }
    });
  });

  test('Returns the requested page', async () => {
    const body = { data: [] };

    mockGet.mockResolvedValue({ data: body });

    expect(await getMoviesInBillboardsList(2)).toBe(body);
    expect(mockGet).toHaveBeenCalledWith(BASE_PATH, {
      withCredentials: true,
      params: { page: 2 }
    });
  });

  test('Returns the detail of a movie in billboard', async () => {
    const detail = { ID_MOVIE_IN_BILLBOARD: 5 };

    mockGet.mockResolvedValue({ data: { data: detail } });

    expect(await getMovieInBillboard(5)).toBe(detail);
  });

  test('Does not call the API with an invalid page', async () => {
    await expect(getMoviesInBillboardsList(0)).rejects.toThrow();
    expect(mockGet).not.toHaveBeenCalled();
  });

  test('Creates a movie in billboard', async () => {
    mockPost.mockResolvedValue({ data: { data: { ID_MOVIE_IN_BILLBOARD: 7 } } });

    const created = await createMovieInBillboard({
      movieId: 1,
      locationId: 2,
      openingDate: '2026-12-01',
      closingDate: '2026-12-31'
    });

    expect(created).toEqual({ ID_MOVIE_IN_BILLBOARD: 7 });
  });

  test('Updates a movie in billboard', async () => {
    mockPut.mockResolvedValue({ data: { data: { ID_MOVIE_IN_BILLBOARD: 7 } } });

    const updated = await updateMovieInBillboard(7, {
      movieId: 1,
      locationId: 2,
      openingDate: '2026-12-01',
      closingDate: '2026-12-31'
    });

    expect(updated).toEqual({ ID_MOVIE_IN_BILLBOARD: 7 });
  });
});
