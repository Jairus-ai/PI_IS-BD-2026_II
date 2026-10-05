import { useEffect, useState } from 'react';
import { getLocations } from '../services/locationService.js';

export function useLocations() {
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState(null);

  useEffect(() => {
    async function loadLocations() {
      try {
        setLoadingLocations(true);
        setLocationsError(null);

        const data = await getLocations();
        setLocations(data);
      } catch (error) {
        setLocationsError(error.message);
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    }

    loadLocations();
  }, []);

  return {
    locations,
    loadingLocations,
    locationsError,
  };
}