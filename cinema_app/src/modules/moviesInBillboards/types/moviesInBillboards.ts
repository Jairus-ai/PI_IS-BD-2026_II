import dayjs from 'dayjs';

const DATE_FORMAT = 'DD/MM/YYYY';

export interface MovieInBillboard {
  ID_MOVIE_IN_BILLBOARD: number;
  MOVIE_TITLE: string;
  LOCATION_NAME: string;
  OPENING_DATE: string;
  CLOSING_DATE: string;
  RATING_NAME: string;
}

export interface MovieInBillboardDetail extends MovieInBillboard {
  RATING_CODE: string;
  MOVIE_DURATION: number;
  POSTER: string;
}

export interface MovieInBillboardPage {
  page: number;
  limit: number;
  data: MovieInBillboard[];
}

export interface MovieInBillboardFilters {
  locationId: number | '';
  ratingId: number | '';
}

export interface LocationOption {
  ID_LOCATION: number;
  LOCATION_NAME: string;
}

export function formatBillboardDate(value: string): string {
  return dayjs(value).format(DATE_FORMAT);
}
