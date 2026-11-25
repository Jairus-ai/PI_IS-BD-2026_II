import * as React from 'react';
import { TextDecoder, TextEncoder } from 'node:util';
import { jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';

// react-router uses TextEncoder at load time and jsdom does not define it
globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

const { MemoryRouter, Route, Routes, useParams } = await import('react-router');

const mockUseMovieScreenings = jest.fn();

jest.unstable_mockModule('../hooks/useMovieScreenings', () => ({
  useMovieScreenings: mockUseMovieScreenings,
}));

const { default: MovieScreeningsPage } = await import('../pages/MovieScreeningsPage');

// Dates relative to today (local time) so the "today" tab is deterministic
const at = (daysFromNow, hour, minute = 0) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysFromNow, hour, minute).toISOString();
};

const movie = {
  ID_MOVIE: 1,
  MOVIE_TITLE: 'Dune',
  SYNOPSIS: 'Una épica del desierto.',
  MOVIE_DURATION: 155,
  PUBLISHING_YEAR: 2021,
  POSTER: 'poster.jpg',
  RATING_NAME: 'Mayores de 12',
  RATING_CODE: 'PG-13',
  GENRES: ['Acción', 'Drama'],
  DIRECTORS: null,
  FORMATS: 'IMAX,2D',
  LANGUAGES: 'Español',
};

const screenings = [
  { ID_SCREENING: 11, ID_LOCATION: 1, LOCATION_NAME: 'Cine Alfa', ID_SCREEN: 3, SCREEN_TYPE: 'VIP', MOVIE_LANGUAGE: 'Doblada', MOVIE_FORMAT: 'IMAX', START_TIME: at(0, 15, 30) },
  { ID_SCREENING: 12, ID_LOCATION: 2, LOCATION_NAME: 'Cine Beta', ID_SCREEN: 1, SCREEN_TYPE: 'Estándar', MOVIE_LANGUAGE: 'Subtitulada', MOVIE_FORMAT: '2D', START_TIME: at(0, 18) },
  { ID_SCREENING: 13, ID_LOCATION: 1, LOCATION_NAME: 'Cine Alfa', ID_SCREEN: 3, SCREEN_TYPE: 'VIP', MOVIE_LANGUAGE: 'Doblada', MOVIE_FORMAT: '3D', START_TIME: at(1, 20, 15) },
  { ID_SCREENING: 14, ID_LOCATION: 1, LOCATION_NAME: 'Cine Alfa', ID_SCREEN: 2, SCREEN_TYPE: 'Estándar', MOVIE_LANGUAGE: 'Doblada', MOVIE_FORMAT: '2D', START_TIME: at(5, 12) },
];

const locations = [
  { ID_LOCATION: 1, LOCATION_NAME: 'Cine Alfa' },
  { ID_LOCATION: 2, LOCATION_NAME: 'Cine Beta' },
];

const setSelectedLocation = jest.fn();
const reload = jest.fn();

const givenState = (overrides = {}) =>
  mockUseMovieScreenings.mockReturnValue({
    movie,
    screenings,
    locations,
    selectedLocation: '',
    setSelectedLocation,
    loading: false,
    error: null,
    hasNoScreenings: false,
    hasNoMatches: false,
    reload,
    ...overrides,
  });

function SeatsProbe() {
  const { screeningId } = useParams();
  return <div>{`Asientos ${screeningId}`}</div>;
}

const renderPage = (path = '/movies/1') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/movies/:idMovie" element={<MovieScreeningsPage />} />
        <Route path="/seats/:screeningId" element={<SeatsProbe />} />
        <Route path="/" element={<div>Inicio</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('MovieScreeningsPage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('shows an invalid-movie message and does not load data when the id is not numeric', () => {
    renderPage('/movies/abc');

    expect(screen.getByText('Película no válida')).toBeTruthy();
    expect(mockUseMovieScreenings).not.toHaveBeenCalled();
  });

  it('shows the loading indicator', () => {
    givenState({ loading: true, movie: null });
    renderPage();

    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows the not-found message and lets the user go back', () => {
    givenState({ movie: null, error: { notFound: true, message: '' } });
    renderPage();

    expect(screen.getByText('La película solicitada no existe.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByText('Inicio')).toBeTruthy();
  });

  it('shows the generic error and lets the user retry', () => {
    givenState({ movie: null, error: { notFound: false, message: 'Falla de red' } });
    renderPage();

    expect(screen.getByText('Falla de red')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('falls back to a default message when there is no movie and no error', () => {
    givenState({ movie: null });
    renderPage();

    expect(screen.getByText('No se pudo cargar la información de la película.')).toBeTruthy();
  });

  it('renders the movie details with formatted lists', () => {
    givenState();
    renderPage();

    expect(screen.getByText('Dune')).toBeTruthy();
    expect(screen.getByText('Acción, Drama')).toBeTruthy();
    expect(screen.getByText('IMAX, 2D')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Póster de Dune' })).toBeTruthy();
  });

  it('replaces the poster with a fallback box when the image fails to load', () => {
    givenState();
    renderPage();

    fireEvent.error(screen.getByRole('img', { name: 'Póster de Dune' }));
    expect(screen.queryByRole('img', { name: 'Póster de Dune' })).toBeNull();
  });

  it('uses the poster fallback and the default synopsis when both are missing', () => {
    givenState({ movie: { ...movie, POSTER: null, SYNOPSIS: null } });
    renderPage();

    expect(screen.queryByRole('img', { name: 'Póster de Dune' })).toBeNull();
    expect(screen.getByText('Sin sinopsis disponible.')).toBeTruthy();
  });

  it('selects the first day and groups the screenings by location', () => {
    givenState();
    renderPage();

    expect(screen.getByRole('tablist', { name: 'Próximos 15 días' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Hoy' }).getAttribute('aria-selected')).toBe('true');

    expect(screen.getByText('Cine Alfa')).toBeTruthy();
    expect(screen.getByText('Cine Beta')).toBeTruthy();
    expect(screen.getByText('IMAX')).toBeTruthy();
    expect(screen.getByText('2D')).toBeTruthy();
    expect(screen.getByText('Doblada · Sala 3 · VIP')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Elegir asientos' })).toHaveLength(2);
  });

  it('switches day and shows only that day screenings', () => {
    givenState();
    renderPage();

    // the second tab is tomorrow (tabs are consecutive days starting today)
    fireEvent.click(screen.getAllByRole('tab')[1]);

    expect(screen.getByText('3D')).toBeTruthy();
    expect(screen.queryByText('Cine Beta')).toBeNull();
  });

  it('navigates to seat selection for the chosen screening', () => {
    givenState();
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: 'Elegir asientos' })[0]);

    expect(screen.getByText('Asientos 11')).toBeTruthy();
  });

  it('shows "all locations" when unfiltered and reports the selected location', () => {
    givenState();
    renderPage();

    expect(screen.getByText('Todas las sucursales')).toBeTruthy();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Cine Alfa' }));
    expect(setSelectedLocation).toHaveBeenCalledWith('1');
  });

  it('clears the location filter by sending an empty string', () => {
    givenState({ selectedLocation: '1' });
    renderPage();

    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Todas las sucursales' }));
    expect(setSelectedLocation).toHaveBeenCalledWith('');
  });

  it('informs when the movie has no screenings and hides the location selector', () => {
    givenState({ screenings: [], locations: [], hasNoScreenings: true });
    renderPage();

    expect(screen.getByText('Esta película no tiene funciones programadas por el momento.')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('informs when the selected location has no screenings and keeps the selector', () => {
    givenState({ screenings: [], selectedLocation: '2', hasNoMatches: true });
    renderPage();

    expect(screen.getByText('No hay funciones programadas en la sucursal seleccionada.')).toBeTruthy();
    expect(screen.getByRole('combobox')).toBeTruthy();
  });
});