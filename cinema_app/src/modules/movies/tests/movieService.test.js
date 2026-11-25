import { expect, jest, test } from '@jest/globals';

const mockGet = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
  api: { get: mockGet }
}));

const { getMovieOptions } = await import('../services/movieService');

test('Returns the movie options', async () => {
  mockGet.mockResolvedValue({ data: { data: [] } });

  expect(await getMovieOptions()).toEqual({ data: [] });
});
