import { describe, expect, jest, test } from '@jest/globals';
import {
  act,
  renderHook,
  waitFor
} from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query';

const mockCreateMovieInBillboard = jest.fn();
const mockUpdateMovieInBillboard = jest.fn();

jest.unstable_mockModule('../services/movieInBillboardService', () => ({
  createMovieInBillboard: mockCreateMovieInBillboard,
  updateMovieInBillboard: mockUpdateMovieInBillboard,
  getMovieInBillboard: jest.fn().mockResolvedValue({ ID_MOVIE_IN_BILLBOARD: 5 }),
  getMoviesInBillboardsCount: jest.fn().mockResolvedValue(1),
  getMoviesInBillboardsList: jest.fn().mockResolvedValue({ data: [{ ID_MOVIE_IN_BILLBOARD: 5 }] })
}));

jest.unstable_mockModule('../../movies/services/movieService', () => ({
  getMovieOptions: jest.fn().mockResolvedValue({ data: [{ ID_MOVIE: 1 }] }),
  getRatings: jest.fn().mockResolvedValue({ data: [{ ID_RATING: 3 }] })
}));

jest.unstable_mockModule('../../users/services/locationService', () => ({
  getLocations: jest.fn().mockResolvedValue([{ ID_LOCATION: 2 }])
}));

const {
  useCreateMovieInBillboard,
  useMovieInBillboard,
  useMovieInBillboardFilterOptions,
  useMovieInBillboardFormOptions,
  useMoviesInBillboards,
  useUpdateMovieInBillboard
} = await import('../hooks/useMoviesInBillboards');

function wrapper({ children }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useMoviesInBillboards', () => {
  test('Loads the list, the detail and the filters', async () => {
    const { result } = renderHook(() => ({
      list: useMoviesInBillboards(1, {}),
      detail: useMovieInBillboard(5),
      filters: useMovieInBillboardFilterOptions()
    }), { wrapper });

    await waitFor(() => expect(result.current.detail.movieInBillboard).not.toBeNull());
    await waitFor(() => expect(result.current.list.totalMoviesInBillboards).toBe(1));
    await waitFor(() => expect(result.current.filters.ratings).toHaveLength(1));

    await act(async () => {
      await result.current.list.refetchMoviesInBillboards();
    });

    expect(result.current.list.moviesInBillboards).toHaveLength(1);
  });

  test('Loads the movies and locations of the form', async () => {
    const { result } = renderHook(() => useMovieInBillboardFormOptions(true), { wrapper });

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false));

    expect(result.current.movies).toEqual([{ ID_MOVIE: 1 }]);
    expect(result.current.locations).toEqual([{ ID_LOCATION: 2 }]);
  });

  test('Creates a movie in billboard', async () => {
    mockCreateMovieInBillboard.mockResolvedValue({ ID_MOVIE_IN_BILLBOARD: 7 });

    const { result } = renderHook(() => useCreateMovieInBillboard(), { wrapper });

    await act(async () => {
      await result.current.createMovieInBillboard({ movieId: 1 });
    });

    expect(mockCreateMovieInBillboard).toHaveBeenCalledWith({ movieId: 1 });
  });

  test('Updates a movie in billboard', async () => {
    mockUpdateMovieInBillboard.mockResolvedValue({ ID_MOVIE_IN_BILLBOARD: 7 });

    const { result } = renderHook(() => useUpdateMovieInBillboard(), { wrapper });

    await act(async () => {
      await result.current.updateMovieInBillboard({
        id: 7,
        movieInBillboard: { movieId: 1 }
      });
    });

    expect(mockUpdateMovieInBillboard).toHaveBeenCalledWith(7, { movieId: 1 });
  });
});
