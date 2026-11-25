import type { NewMovieInBillboard } from '../types/moviesInBillboards';
import type { MovieInBillboardFormValues } from './movieInBillboardFormValidation';

export function buildMovieInBillboardPayload(values: MovieInBillboardFormValues): NewMovieInBillboard {
  return {
    movieId: Number(values.movieId),
    locationId: Number(values.locationId),
    openingDate: values.openingDate,
    closingDate: values.closingDate,
    premier: values.premier
  };
}
