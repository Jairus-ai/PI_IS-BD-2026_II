import { useState } from 'react';
import { useUsers } from '../hooks/useUsers.js';
import { useLocations } from '../hooks/useLocations.js';

function UserList() {
  const [filters, setFilters] = useState({
    name: '',
    role: '',
    status: '',
    locationId: '',
  });

  const { users, loading, error } = useUsers(filters);

  const {
    locations,
    loadingLocations,
    locationsError,
  } = useLocations();

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      name: '',
      role: '',
      status: '',
      locationId: '',
    });
  }

  function formatRole(role) {
    const roles = {
      CLIENT: 'Cliente',
      SUPERUSER: 'Superusuario',
      ADMINISTRATOR: 'Administrador',
      EMPLOYEE: 'Empleado',
    };

    return roles[role] || role;
  }

  function formatStatus(status) {
    const statuses = {
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
    };

    return statuses[status] || status;
  }

  function formatDate(date) {
    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleDateString('es-CR');
  }

  return (
    <div>
      <h1>Usuarios</h1>

      <div>
        <input
          type="text"
          name="name"
          placeholder="Buscar por nombre"
          value={filters.name}
          onChange={handleChange}
        />

        <select
          name="role"
          value={filters.role}
          onChange={handleChange}
        >
          <option value="">Todos los roles</option>
          <option value="CLIENT">Cliente</option>
          <option value="SUPERUSER">Superusuario</option>
          <option value="ADMINISTRATOR">Administrador</option>
          <option value="EMPLOYEE">Empleado</option>
        </select>

        <select
          name="status"
          value={filters.status}
          onChange={handleChange}
        >
          <option value="">Todos los estados</option>
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>

        <select
          name="locationId"
          value={filters.locationId}
          onChange={handleChange}
          disabled={loadingLocations}
        >
          <option value="">
            {loadingLocations
              ? 'Cargando sucursales...'
              : 'Todas las sucursales'}
          </option>

        {locations.map((location) => (
          <option
            key={location.ID_LOCATION}
            value={location.ID_LOCATION}
          >
            {location.LOCATION_NAME}
          </option>
        ))}
      </select>

        <button onClick={clearFilters}>
          Limpiar filtros
        </button>
      </div>

      {loading && <p>Cargando usuarios...</p>}

      {error && <p>Error: {error}</p>}

      {!loading && !error && users.length === 0 && (
        <p>No se encontraron usuarios.</p>
      )}

      {!loading && !error && users.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Identificación</th>
              <th>Correo</th>
              <th>Fecha de nacimiento</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Sucursales</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.USER_KEY}>
                <td>
                  {user.FIRST_NAME} {user.MIDDLE_NAME || ''}{' '}
                  {user.FIRST_SURNAME} {user.LAST_SURNAME || ''}
                </td>

                <td>{user.IDENTIFICATION_NUMBER}</td>
                <td>{user.EMAIL}</td>
                <td>{formatDate(user.BIRTHDATE)}</td>
                <td>{user.PHONE_NUMBER}</td>
                <td>{formatRole(user.ROLE)}</td>
                <td>{formatStatus(user.STATUS)}</td>
                <td>{user.LOCATIONS || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {locationsError && (
        <p>Error al cargar sucursales: {locationsError}</p>
      )}
    </div>
  );
}

export default UserList;