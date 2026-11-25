import { useEffect, useMemo, useState } from 'react';
import { getMovieById } from '../../movies/services/movieService';
import { getScreeningsByMovie } from '../services/screeningService';

export const useMovieScreenings = (idMovie) => {
  const [movie, setMovie] = useState(null);
  const [allScreenings, setAllScreenings] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedLocation('');

    Promise.all([getMovieById(idMovie), getScreeningsByMovie(idMovie)])
      .then(([movieRes, screeningsRes]) => {
        if (cancelled) return;
        setMovie(movieRes.data);
        setAllScreenings(screeningsRes.data ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError({
          notFound: err.response?.status === 404,
          message: 'No se pudo cargar la información de la película.',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idMovie, reloadKey]);

  const locations = useMemo(() => {
    const byId = new Map();
    allScreenings.forEach(({ ID_LOCATION, LOCATION_NAME }) => {
      if (!byId.has(ID_LOCATION)) byId.set(ID_LOCATION, { ID_LOCATION, LOCATION_NAME });
    });
    return [...byId.values()].sort((a, b) => a.LOCATION_NAME.localeCompare(b.LOCATION_NAME));
  }, [allScreenings]);

  const screenings = useMemo(
    () =>
      selectedLocation === ''
        ? allScreenings
        : allScreenings.filter((s) => String(s.ID_LOCATION) === selectedLocation),
    [allScreenings, selectedLocation],
  );

  return {
    movie,
    screenings,
    locations,
    selectedLocation,
    setSelectedLocation,
    loading,
    error,
    hasNoScreenings: !loading && !error && allScreenings.length === 0,
    hasNoMatches: !loading && !error && allScreenings.length > 0 && screenings.length === 0,
    reload: () => setReloadKey((k) => k + 1),
  };
};