import dayjs from 'dayjs';

const DATE_FORMAT = 'DD/MM/YYYY';

export interface Screening {
  ID_SCREENING: number;
  LOCATION_NAME: string;
  SCREEN_NUMBER: number;
  MOVIE_TITLE: string;
  ID_LOCATION: number;
  ID_AUDIOVISUAL_FORMAT: number;
  ID_RATING: number;
}

export interface ScreeningDetail {
  ID_SCREENING: number;
  LOCATION_NAME: string;
  SCREEN_NUMBER: number;
  MOVIE_TITLE: string;
  RATING_NAME: string;
  RATING_CODE: string;
  LANGUAGE: string;
  AUDIOVISUAL_FORMAT: string;
  SCREENING_DATE: string;
  START_TIME: string;
  DURATION: number;
  HAS_SOLD_TICKETS: number;
}

export interface ScreeningPage {
  page: number;
  limit: number;
  data: Screening[];
}

export interface ScreeningFilters {
  locationId: number | '';
  audiovisualFormatId: number | '';
  ratingId: number | '';
  movieName: string;
}

export function formatScreeningDate(value: string): string {
  return dayjs(value).format(DATE_FORMAT);
}
