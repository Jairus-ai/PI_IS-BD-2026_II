const API_URL = 'http://localhost:3000/management';

export async function getLocations() {
  const response = await fetch(`${API_URL}/locations`);

  if (!response.ok) {
    const errorData = await response.json();

    throw new Error(
      errorData.message || 'No fue posible cargar las sucursales.'
    );
  }

  const data = await response.json();

  return data.data;
}