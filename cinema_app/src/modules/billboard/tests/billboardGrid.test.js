import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { TextDecoder, TextEncoder } from 'node:util';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

const mockUseNowShowingMovies = jest.fn();

jest.unstable_mockModule('../hooks/useBillboardMovies', () => ({
  useNowShowingMovies: mockUseNowShowingMovies
}));
jest.unstable_mockModule('../../../services/api', () => ({
  API_BASE_URL: 'http://api.test',
  api: {}
}));

const { MemoryRouter, Route, Routes, useParams } = await import('react-router');
const { default: BillboardGrid } = await import('../components/BillboardGrid');

const MOVIES = [
  { ID_MOVIE: 1, MOVIE_TITLE: 'Inception', POSTER: '/posters/inception.jpg', MOVIE_DURATION: 148, RATING_CODE: 'PG-13', GENRES: 'Acción, Ciencia ficción' },
  { ID_MOVIE: 2, MOVIE_TITLE: 'El último faro', POSTER: null, MOVIE_DURATION: 95, RATING_CODE: 'TP', GENRES: null }
];

function mockMovies(overrides = {}) {
  mockUseNowShowingMovies.mockReturnValue({
    movies: MOVIES,
    isLoadingMovies: false,
    moviesError: null,
    refetchMovies: jest.fn(),
    ...overrides
  });
}

function MovieProbe() {
  const { idMovie } = useParams();
  return <div>{`Detalle ${idMovie}`}</div>;
}

const renderGrid = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<BillboardGrid />} />
        <Route path="/movies/:idMovie" element={<MovieProbe />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockMovies();
});

afterEach(cleanup);

describe('BillboardGrid', () => {
  test('Shows each movie with its poster, title, rating, duration and genres', () => {
    renderGrid();

    expect(screen.getByRole('heading', { name: 'Cartelera' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Inception' })).toHaveAttribute('src', 'http://api.test/posters/inception.jpg');
    expect(screen.getAllByText('Inception').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PG-13').length).toBeGreaterThan(0);
    expect(screen.getByText('Acción, Ciencia ficción · 148 min')).toBeInTheDocument();
  });

  test('Shows a placeholder when the movie has no poster', () => {
    renderGrid();

    const card = screen.getByRole('link', { name: 'Ver detalle de El último faro' });
    expect(card).toHaveTextContent('Imagen no disponible');
    expect(card).toHaveTextContent('Sin género · 95 min');
  });

  test('Shows a placeholder when the poster does not load', () => {
    renderGrid();

    fireEvent.error(screen.getByRole('img', { name: 'Inception' }));

    expect(screen.queryByRole('img', { name: 'Inception' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver detalle de Inception' })).toHaveTextContent('Imagen no disponible');
  });

  test('Selecting a movie opens its details with the movie id', () => {
    renderGrid();

    fireEvent.click(screen.getByRole('link', { name: 'Ver detalle de Inception' }));

    expect(screen.getByText('Detalle 1')).toBeInTheDocument();
  });

  test('Shows a message instead of an empty section when there are no movies', () => {
    mockMovies({ movies: [] });
    renderGrid();

    expect(screen.getByText(/No hay películas en cartelera por el momento/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  test('Shows a loading indicator', () => {
    mockMovies({ movies: [], isLoadingMovies: true });
    renderGrid();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Cargando cartelera...')).toBeInTheDocument();
  });

  test('Shows the load error with a retry button', () => {
    const refetchMovies = jest.fn();
    mockMovies({ movies: [], moviesError: new Error('Network Error'), refetchMovies });
    renderGrid();

    expect(screen.getByText('No se pudo cargar la cartelera')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(refetchMovies).toHaveBeenCalledTimes(1);
  });
});
