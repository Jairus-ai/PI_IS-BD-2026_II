import type { MovieInBillboardDetail } from '../types/moviesInBillboards';
import type { MovieInBillboardFormValues } from './movieInBillboardFormValidation';

export function mapDetailToFormValues(detail: MovieInBillboardDetail): MovieInBillboardFormValues {
  return {
    movieId: detail.ID_MOVIE,
    locationId: detail.ID_LOCATION,
    openingDate: detail.OPENING_DATE,
    closingDate: detail.CLOSING_DATE,
    premier: detail.PREMIER === 1
  };
}
