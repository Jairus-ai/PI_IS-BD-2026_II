import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { TextDecoder, TextEncoder } from 'node:util';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

const mockUseScreens = jest.fn();

jest.unstable_mockModule('../hooks/useScreens', () => ({
  useScreens: mockUseScreens,
  useScreenLocations: () => ({ locations: [{ ID_LOCATION: 1, LOCATION_NAME: 'Oxígeno' }], isLoadingLocations: false, locationsError: null }),
  useCreateScreen: () => ({ createScreen: jest.fn(), isCreatingScreen: false })
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
  default: () => ({ show: jest.fn() })
}));

const { default: ScreenList } = await import('../pages/ScreenList');

function buildScreen(id, overrides = {}) {
  return {
    ID_SCREEN: id,
    SCREEN_NAME: `Sala ${String(id).padStart(2, '0')}`,
    SCREEN_TYPE: 'REG',
    AMOUNT_ROWS: 10,
    AMOUNT_SEATS_PER_ROWS: 12,
    AMOUNT_SEATS: 120,
    MAINTENANCE_TIME: 15,
    ADDS_TIME: 10,
    ID_LOCATION: 1,
    LOCATION_NAME: 'Oxígeno',
    ...overrides
  };
}

const SCREENS = [
  buildScreen(1, { SCREEN_TYPE: 'IMAX', AMOUNT_SEATS: 200, AMOUNT_ROWS: 10, AMOUNT_SEATS_PER_ROWS: 20 }),
  buildScreen(2, { ID_LOCATION: 2, LOCATION_NAME: 'Escazú', SCREEN_NAME: 'Sala 01', SCREEN_TYPE: 'VIP' })
];

function mockScreens(overrides = {}) {
  mockUseScreens.mockReturnValue({
    screens: SCREENS,
    isLoadingScreens: false,
    screensError: null,
    refetchScreens: jest.fn(),
    ...overrides
  });
}

function chooseFilter(label, option) {
  fireEvent.mouseDown(within(screen.getByText(label, { selector: 'label' }).parentElement).getByRole('combobox'));
  fireEvent.click(screen.getByRole('option', { name: option }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockScreens();
});

afterEach(cleanup);

describe('ScreenList', () => {
  test('Shows the columns and the active screens', () => {
    render(<ScreenList />);

    expect(screen.getByRole('heading', { name: 'Salas' })).toBeInTheDocument();
    for (const header of ['Sala', 'Sucursal', 'Tipo de sala', 'Capacidad', 'Acciones']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(screen.getByRole('gridcell', { name: 'Escazú' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'IMAX' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '200' })).toBeInTheDocument();
  });

  test('Shows 10 screens per page and moves to the next page', () => {
    mockScreens({ screens: Array.from({ length: 12 }, (_, index) => buildScreen(index + 1)) });
    render(<ScreenList />);

    expect(screen.getAllByRole('button', { name: 'Mostrar' })).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
    expect(screen.getAllByRole('button', { name: 'Mostrar' })).toHaveLength(2);
  });

  test('Filters by location and type', () => {
    render(<ScreenList />);

    chooseFilter('Sucursal', 'Escazú');
    expect(screen.getAllByRole('button', { name: 'Mostrar' })).toHaveLength(1);
    expect(screen.getByRole('gridcell', { name: 'VIP' })).toBeInTheDocument();

    chooseFilter('Tipo de sala', 'IMAX');
    expect(screen.getByText('No se encontraron salas con los filtros aplicados')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getAllByRole('button', { name: 'Mostrar' })).toHaveLength(2);
  });

  test('Shows the detail of the screen in a modal', async () => {
    render(<ScreenList />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar' })[0]);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Sala 01 - Oxígeno')).toBeInTheDocument();
    for (const value of ['Oxígeno', 'IMAX', '20', '200', '15 min', '10 min']) {
      expect(within(dialog).getByText(value)).toBeInTheDocument();
    }
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Cerrar' }).at(-1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('The "Agregar sala" button opens the creation form', async () => {
    render(<ScreenList />);

    fireEvent.click(screen.getByRole('button', { name: /Agregar sala/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: /Agregar sala/ })).toBeInTheDocument();
  });

  test('Shows a message when there are no screens', () => {
    mockScreens({ screens: [] });
    render(<ScreenList />);

    expect(screen.getByText('No hay salas registradas')).toBeInTheDocument();
  });

  test('Shows the load error with a retry button', () => {
    const refetchScreens = jest.fn();
    mockScreens({ screens: [], screensError: new Error('Network Error'), refetchScreens });
    render(<ScreenList />);

    expect(screen.getByText('No se pudieron cargar las salas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(refetchScreens).toHaveBeenCalledTimes(1);
  });

  test('Shows a loading indicator', () => {
    mockScreens({ screens: [], isLoadingScreens: true });
    const { container } = render(<ScreenList />);

    //the grid shows its loading overlay instead of the empty message
    expect(container.querySelector('.MuiDataGrid-overlay')).toBeInTheDocument();
    expect(screen.queryByText('No hay salas registradas')).not.toBeInTheDocument();
  });
});
