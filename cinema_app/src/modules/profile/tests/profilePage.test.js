import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mockUseProfile = jest.fn();
const mockSaveProfile = jest.fn();
const mockShow = jest.fn();
const mockRefetch = jest.fn();

jest.unstable_mockModule('../hooks/useProfile', () => ({
  useProfile: mockUseProfile,
  useUpdateProfile: () => ({ saveProfile: mockSaveProfile, isSavingProfile: false })
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
  default: () => ({ show: mockShow })
}));
jest.unstable_mockModule('../../../components/common/PageContainer', () => ({
  default: ({ title, breadcrumbs, children }) => (
    <section>
      {breadcrumbs?.map((breadcrumb) => <a key={breadcrumb.title} href={breadcrumb.path}>{breadcrumb.title}</a>)}
      <h1>{title}</h1>
      {children}
    </section>
  )
}));

const { default: ProfilePage } = await import('../pages/ProfilePage');

const CLIENT = {
  email: 'prueba.prueba@ejemplo.com',
  identificationType: 'C',
  identificationNumber: '112345678',
  phoneNumber: '88881234',
  firstName: 'Laura',
  middleName: '',
  firstSurname: 'Vega',
  lastSurname: 'Mora',
  birthdate: '1998-03-15',
  role: 'CLIENT',
  locations: null
};
const EMPLOYEE = { ...CLIENT, role: 'EMPLOYEE', locations: [{ id: 1, name: 'Oxígeno' }, { id: 2, name: 'Escazú' }] };
function mockProfile(overrides = {}) {
  mockUseProfile.mockReturnValue({
    profile: CLIENT,
    isLoadingProfile: false,
    profileError: null,
    refetchProfile: mockRefetch,
    ...overrides
  });
}

const field = (label) => screen.getByLabelText(new RegExp(`^${label}`));
function startEditing() {
  fireEvent.click(screen.getByRole('button', { name: 'Editar perfil' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile();
});

afterEach(cleanup);

describe('ProfilePage: visualizar', () => {
  test('Shows the personal information in read only mode', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(field('Nombre')).toHaveValue('Laura');
    expect(field('Primer apellido')).toHaveValue('Vega');
    expect(field('Correo electrónico')).toHaveValue('prueba.prueba@ejemplo.com');
    expect(field('Cédula')).toHaveValue('112345678');
    expect(field('Celular')).toHaveValue('88881234');
    expect(field('Fecha de nacimiento')).toHaveValue('15/03/1998');
    expect(field('Rol')).toHaveValue('Cliente');
    expect(field('Nombre')).toHaveAttribute('readonly');
    expect(field('Nombre')).toHaveAttribute('tabindex', '-1');
    expect(field('Correo electrónico')).toHaveAttribute('tabindex', '-1');
  });

  test('Shows a link back to the home page', () => {
    render(<ProfilePage />);

    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  test('Hides the locations section for clients', () => {
    render(<ProfilePage />);

    expect(screen.queryByLabelText('Sucursales asignadas')).not.toBeInTheDocument();
  });

  test('Shows the assigned locations for workers', () => {
    mockProfile({ profile: EMPLOYEE });
    render(<ProfilePage />);

    expect(field('Sucursales asignadas')).toHaveValue('Oxígeno, Escazú');
    expect(field('Rol')).toHaveValue('Empleado');
  });

  test('Shows a message when the worker has no locations', () => {
    mockProfile({ profile: { ...EMPLOYEE, locations: [] } });
    render(<ProfilePage />);

    expect(field('Sucursales asignadas')).toHaveValue('No tiene sucursales asignadas');
  });

  test('Shows a loading indicator', () => {
    mockProfile({ profile: null, isLoadingProfile: true });
    render(<ProfilePage />);

    expect(screen.getByLabelText('Cargando información personal')).toBeInTheDocument();
  });

  test('Shows the load error with a retry button', () => {
    mockProfile({ profile: null, profileError: new Error('fail') });
    render(<ProfilePage />);

    expect(screen.getByText('No se pudo cargar la información personal')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('ProfilePage: modificar', () => {
  test('Editing enables only name and phone fields', () => {
    render(<ProfilePage />);
    startEditing();

    expect(screen.getByRole('heading', { name: 'Editar perfil' })).toBeInTheDocument();
    expect(field('Nombre')).not.toHaveAttribute('readonly');
    expect(field('Celular')).not.toHaveAttribute('readonly');
    expect(field('Correo electrónico')).toBeDisabled();
    expect(field('Nombre')).not.toHaveAttribute('tabindex');
    expect(field('Cédula')).toBeDisabled();
    expect(field('Rol')).toBeDisabled();
  });

  test('Guardar stays disabled until a field changes', () => {
    render(<ProfilePage />);
    startEditing();

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    fireEvent.change(field('Nombre'), { target: { value: 'Lauren' } });
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  test.each([
    ['Nombre', '', 'Campo obligatorio'],
    ['Primer apellido', 'Vega2', 'Solo se permiten letras y espacios'],
    ['Celular', '8888123', 'El celular debe tener 8 dígitos']
  ])('Shows the error of %s and does not open the confirmation', (label, value, message) => {
    render(<ProfilePage />);
    startEditing();

    fireEvent.change(field(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('The confirmation lists the previous and new values', () => {
    render(<ProfilePage />);
    startEditing();

    fireEvent.change(field('Nombre'), { target: { value: 'Lauren' } });
    fireEvent.change(field('Celular'), { target: { value: '87776655' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('¿Desea guardar los siguientes cambios?')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Nombre: Laura → Lauren');
    expect(dialog).toHaveTextContent('Celular: 88881234 → 87776655');
  });

  test('Cancelling the confirmation keeps the edited values', async () => {
    render(<ProfilePage />);
    startEditing();

    fireEvent.change(field('Nombre'), { target: { value: 'Lauren' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockSaveProfile).not.toHaveBeenCalled();
    expect(field('Nombre')).toHaveValue('Lauren');
  });

  test('Confirming saves the cleaned values once and shows the success message', async () => {
    let resolveSave;
    mockSaveProfile.mockReturnValue(new Promise((resolve) => { resolveSave = resolve; }));
    render(<ProfilePage />);
    startEditing();

    fireEvent.change(field('Nombre'), { target: { value: '  Lauren ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    const confirm = within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    resolveSave({ ...CLIENT, firstName: 'Lauren' });

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith('Información actualizada correctamente', { severity: 'success', autoHideDuration: 5000 })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockSaveProfile).toHaveBeenCalledTimes(1);
    expect(mockSaveProfile).toHaveBeenCalledWith({ firstName: 'Lauren', middleName: '', firstSurname: 'Vega', lastSurname: 'Mora', phoneNumber: '88881234' });
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
  });

  test('A save error keeps the edited values and shows the error message', async () => {
    mockSaveProfile.mockRejectedValue(new Error('Network Error'));
    render(<ProfilePage />);
    startEditing();

    fireEvent.change(field('Nombre'), { target: { value: 'Lauren' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith('No se pudo actualizar la información', { severity: 'error', autoHideDuration: 5000 })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Editar perfil' })).toBeInTheDocument();
    expect(field('Nombre')).toHaveValue('Lauren');
  });

  test('Cancelar discards the changes', () => {
    render(<ProfilePage />);
    startEditing();

    fireEvent.change(field('Nombre'), { target: { value: 'Lauren' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(field('Nombre')).toHaveValue('Laura');
  });
});
