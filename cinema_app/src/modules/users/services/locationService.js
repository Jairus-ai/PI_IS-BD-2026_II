import { API_BASE_URL } from '../../../services/api'
const API_URL = `${API_BASE_URL}/management`;

export async function getLocations() {
  const response = await fetch(`${API_URL}/locations`, {credentials: "include"});

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.message || 'No fue posible cargar las sucursales.'
    );
  }

  const data = await response.json();

  return data.data;
}