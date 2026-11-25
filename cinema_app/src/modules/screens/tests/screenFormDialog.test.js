import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mockCreateScreen = jest.fn();
const mockShow = jest.fn();
let mockLocations = [];

jest.unstable_mockModule('../hooks/useScreens', () => ({
  useScreenLocations: () => ({ locations: mockLocations, isLoadingLocations: false, locationsError: null }),
  useCreateScreen: () => ({ createScreen: mockCreateScreen, isCreatingScreen: false })
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
  default: () => ({ show: mockShow })
}));

const { default: ScreenFormDialog } = await import('../components/ScreenFormDialog');

const LOCATIONS = [
  { ID_LOCATION: 1, LOCATION_NAME: 'Oxígeno' },
  { ID_LOCATION: 2, LOCATION_NAME: 'Escazú' }
];

const field = (label) => screen.getByLabelText(new RegExp(`^${label}`));

function choose(label, option) {
  fireEvent.mouseDown(field(label));
  fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: option }));
}

function fillForm({ rows = '10', seatsPerRow = '12', maintenanceTime = '15', addsTime = '10' } = {}) {
  choose('Sucursal', 'Escazú');
  choose('Tipo de sala', 'IMAX');
  fireEvent.change(field('Cantidad de filas'), { target: { value: rows } });
  fireEvent.change(field('Asientos por fila'), { target: { value: seatsPerRow } });
  fireEvent.change(field('Tiempo de mantenimiento'), { target: { value: maintenanceTime } });
  fireEvent.change(field('Tiempo de anuncios'), { target: { value: addsTime } });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLocations = LOCATIONS;
});

afterEach(cleanup);

describe('ScreenFormDialog', () => {
  test('Shows the creation fields and only the locations the user can manage', () => {
    render(<ScreenFormDialog open onClose={jest.fn()} />);

    for (const label of ['Sucursal', 'Tipo de sala', 'Cantidad de filas', 'Asientos por fila', 'Tiempo de mantenimiento', 'Tiempo de anuncios']) {
      expect(field(label)).toBeInTheDocument();
    }
    fireEvent.mouseDown(field('Sucursal'));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Oxígeno', 'Escazú']);
  });

  test('Calculates the capacity while the fields are filled', () => {
    render(<ScreenFormDialog open onClose={jest.fn()} />);

    expect(screen.getByText('Se calcula con las filas y los asientos por fila')).toBeInTheDocument();
    fireEvent.change(field('Cantidad de filas'), { target: { value: '8' } });
    fireEvent.change(field('Asientos por fila'), { target: { value: '15' } });

    expect(screen.getByText('120 asientos')).toBeInTheDocument();
  });

  test('Empty fields show "Campo obligatorio" and nothing is sent', () => {
    render(<ScreenFormDialog open onClose={jest.fn()} />);

    submit();

    expect(screen.getAllByText('Campo obligatorio')).toHaveLength(6);
    expect(mockCreateScreen).not.toHaveBeenCalled();
  });

  test.each([
    [{ rows: '27' }, 'La cantidad de filas debe estar entre 1 y 26'],
    [{ seatsPerRow: '0' }, 'Los asientos por fila deben estar entre 1 y 30'],
    [{ maintenanceTime: '45' }, 'El tiempo de mantenimiento debe estar entre 0 y 30 minutos'],
    [{ addsTime: '31' }, 'El tiempo de anuncios debe estar entre 0 y 30 minutos']
  ])('Out of range %p shows its message and nothing is sent', (values, message) => {
    render(<ScreenFormDialog open onClose={jest.fn()} />);

    fillForm(values);
    submit();

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(mockCreateScreen).not.toHaveBeenCalled();
  });

  test('Creates the screen once even with a double click and shows the success message', async () => {
    let resolveCreate;
    mockCreateScreen.mockReturnValue(new Promise((resolve) => { resolveCreate = resolve; }));
    const onClose = jest.fn();
    render(<ScreenFormDialog open onClose={onClose} />);

    fillForm();
    submit();
    submit();
    resolveCreate({ ID_SCREEN: 9 });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockCreateScreen).toHaveBeenCalledTimes(1);
    expect(mockCreateScreen).toHaveBeenCalledWith({ locationId: 2, type: 'IMAX', rows: 10, seatsPerRow: 12, maintenanceTime: 15, addsTime: 10 });
    expect(mockShow).toHaveBeenCalledWith('Sala agregada correctamente', { severity: 'success', autoHideDuration: 3000 });
  });

  test('A save error shows the message and keeps the entered data', async () => {
    mockCreateScreen.mockRejectedValue(new Error('Network Error'));
    const onClose = jest.fn();
    render(<ScreenFormDialog open onClose={onClose} />);

    fillForm();
    submit();

    expect(await screen.findByText('No se pudo agregar la sala')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(field('Cantidad de filas')).toHaveValue('10');
    expect(field('Tiempo de mantenimiento')).toHaveValue('15');
  });

  test('Shows the field errors sent by the server', async () => {
    mockCreateScreen.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { errors: { locationId: 'Seleccione una sucursal válida' } } }
    });
    render(<ScreenFormDialog open onClose={jest.fn()} />);

    fillForm();
    submit();

    expect(await screen.findByText('Seleccione una sucursal válida')).toBeInTheDocument();
  });

  test('Cancelar closes the form without creating the screen', () => {
    const onClose = jest.fn();
    render(<ScreenFormDialog open onClose={onClose} />);

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockCreateScreen).not.toHaveBeenCalled();
  });

  test('Warns when the user has no locations to add screens', () => {
    mockLocations = [];
    render(<ScreenFormDialog open onClose={jest.fn()} />);

    expect(screen.getByText('No tiene sucursales disponibles para agregar salas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  });
});
