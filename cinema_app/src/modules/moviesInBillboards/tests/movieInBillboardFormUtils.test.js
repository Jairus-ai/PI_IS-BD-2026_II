import { expect, test } from '@jest/globals';
import dayjs from 'dayjs';
import { mapDetailToFormValues } from '../utils/movieInBillboardFormHydration';
import { buildMovieInBillboardPayload } from '../utils/movieInBillboardPayloadBuilder';
import { validateMovieInBillboardForm } from '../utils/movieInBillboardFormValidation';
import {
  readServerMessage,
  toApiDate,
  toPickerDate
} from '../utils/movieInBillboardFormUtils';

const VALUES = {
  movieId: 1,
  locationId: 2,
  openingDate: '2026-12-01',
  closingDate: '2026-12-31',
  premier: true
};

test('Maps the detail to form values and back to a payload', () => {
  const values = mapDetailToFormValues({
    ID_MOVIE: 1,
    ID_LOCATION: 2,
    OPENING_DATE: '2026-12-01',
    CLOSING_DATE: '2026-12-31',
    PREMIER: 1
  });

  expect(values).toEqual(VALUES);
  expect(buildMovieInBillboardPayload(values)).toEqual(VALUES);
  expect(validateMovieInBillboardForm(values)).toEqual({});
});

test('Converts the dates of the pickers', () => {
  expect(toApiDate(dayjs('2026-12-01'))).toBe('2026-12-01');
  expect(toApiDate(null)).toBe('');
  expect(toPickerDate('')).toBeNull();
  expect(toPickerDate('2026-12-01')?.isValid()).toBe(true);
});

test('Reads the server message or uses the fallback', () => {
  const axiosError = {
    isAxiosError: true,
    response: { data: { message: 'Fechas ocupadas' } }
  };

  expect(readServerMessage(axiosError, 'Error')).toBe('Fechas ocupadas');
  expect(readServerMessage(new Error('x'), 'Error')).toBe('Error');
});
