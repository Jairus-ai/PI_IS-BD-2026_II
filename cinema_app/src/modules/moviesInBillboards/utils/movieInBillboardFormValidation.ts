import { getMovieInBillboardFormErrors } from '../validators/movieInBillboardValidator';

export interface MovieInBillboardFormValues {
  movieId: number | null;
  locationId: number | '';
  openingDate: string;
  closingDate: string;
  premier: boolean;
}

export type MovieInBillboardFormErrors = Partial<Record<keyof MovieInBillboardFormValues, string>>;

export const EMPTY_FORM_VALUES: MovieInBillboardFormValues = {
  movieId: null,
  locationId: '',
  openingDate: '',
  closingDate: '',
  premier: false
};

export function validateMovieInBillboardForm(values: MovieInBillboardFormValues): MovieInBillboardFormErrors {
  return getMovieInBillboardFormErrors(values);
}
