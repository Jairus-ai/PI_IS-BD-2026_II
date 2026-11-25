import { jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockGetMovieById = jest.fn();
const mockGetScreeningsByMovie = jest.fn();

jest.unstable_mockModule('../../movies/services/movieService', () => ({
  getMovieById: mockGetMovieById,
}));
jest.unstable_mockModule('../services/screeningService', () => ({
  getScreeningsByMovie: mockGetScreeningsByMovie,
}));

const { useMovieScreenings } = await import('../hooks/useMovieScreenings');

const movie = { ID_MOVIE: 1, MOVIE_TITLE: 'Dune' };
const screenings = [
  { ID_SCREENING: 1, ID_LOCATION: 2, LOCATION_NAME: 'Zeta' },
  { ID_SCREENING: 2, ID_LOCATION: 1, LOCATION_NAME: 'Alfa' },
  { ID_SCREENING: 3, ID_LOCATION: 1, LOCATION_NAME: 'Alfa' },
];

const renderLoaded = async () => {
  const hook = renderHook(() => useMovieScreenings(1));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

describe('useMovieScreenings', () => {
  beforeEach(() => {
    mockGetMovieById.mockReset();
    mockGetScreeningsByMovie.mockReset();
    mockGetMovieById.mockResolvedValue({ data: movie });
    mockGetScreeningsByMovie.mockResolvedValue({ data: screenings });
  });

  it('loads the movie and screenings, and derives unique locations sorted by name', async () => {
    const { result } = renderHook(() => useMovieScreenings(1));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetMovieById).toHaveBeenCalledWith(1);
    expect(mockGetScreeningsByMovie).toHaveBeenCalledWith(1);
    expect(result.current.movie).toEqual(movie);
    expect(result.current.screenings).toHaveLength(3);
    expect(result.current.locations.map((l) => l.LOCATION_NAME)).toEqual(['Alfa', 'Zeta']);
    expect(result.current.error).toBeNull();
  });

  it('filters by location on the client and detects a location without screenings', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setSelectedLocation('1'));
    expect(result.current.screenings).toHaveLength(2);
    expect(result.current.hasNoMatches).toBe(false);

    act(() => result.current.setSelectedLocation('99'));
    expect(result.current.screenings).toHaveLength(0);
    expect(result.current.hasNoMatches).toBe(true);
    expect(mockGetScreeningsByMovie).toHaveBeenCalledTimes(1);
  });

  it('sets hasNoScreenings when the movie has no screenings', async () => {
    mockGetScreeningsByMovie.mockResolvedValue({ data: [] });

    const { result } = await renderLoaded();

    expect(result.current.hasNoScreenings).toBe(true);
    expect(result.current.hasNoMatches).toBe(false);
  });

  it('tolerates a response without the data field', async () => {
    mockGetScreeningsByMovie.mockResolvedValue({});

    const { result } = await renderLoaded();

    expect(result.current.screenings).toEqual([]);
    expect(result.current.hasNoScreenings).toBe(true);
  });

  it('sets notFound when the movie request returns 404', async () => {
    mockGetMovieById.mockRejectedValue({ response: { status: 404 } });

    const { result } = await renderLoaded();

    expect(result.current.error.notFound).toBe(true);
    expect(result.current.hasNoScreenings).toBe(false);
  });

  it('returns a generic error for any other failure', async () => {
    mockGetScreeningsByMovie.mockRejectedValue(new Error('network'));

    const { result } = await renderLoaded();

    expect(result.current.error.notFound).toBe(false);
    expect(result.current.error.message).toBe('No se pudo cargar la información de la película.');
  });

  it('reload requests the data again', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.reload());

    await waitFor(() => expect(mockGetMovieById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetScreeningsByMovie).toHaveBeenCalledTimes(2);
  });
});