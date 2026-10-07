const API_URL = 'http://localhost:3000/management';

export async function getUsers(filters = {}) {
  const params = new URLSearchParams();

  if (filters.role) {
    params.append('role', filters.role);
  }

  if (filters.status) {
    params.append('status', filters.status);
  }

  if (filters.locationId) {
    params.append('locationId', filters.locationId);
  }

  if (filters.name) {
    params.append('name', filters.name);
  }

  const queryString = params.toString();

  const url = queryString
    ? `${API_URL}/users?${queryString}`
    : `${API_URL}/users`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.message || 'No fue posible cargar los usuarios.'
    );
  }

  const data = await response.json();

  return data.data;
}

export async function deactivateWorker(workerId) {
  const response = await fetch(
    `${API_URL}/users/${workerId}/deactivate`,
    {
      method: 'PATCH',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'No fue posible desactivar la cuenta.'
    );
  }

  return data;
}