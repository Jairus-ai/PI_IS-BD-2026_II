type ListValue = string | string[] | null | undefined;

export interface Movie {
    ID_MOVIE: number;
    MOVIE_TITLE: string;
    SYNOPSIS: string | null;
    MOVIE_DURATION: number;
    PUBLISHING_YEAR: number;
    POSTER: string | null;
    RATING_NAME: string;
    RATING_CODE: string;
    GENRES: ListValue;
    DIRECTORS: ListValue;
    FORMATS: ListValue;
    LANGUAGES: ListValue;
}

export interface Screening {
    ID_SCREENING: number;
    ID_LOCATION: number;
    LOCATION_NAME: string;
    ID_SCREEN: number;
    SCREEN_TYPE: string;
    MOVIE_LANGUAGE: string;
    MOVIE_FORMAT: string;
    START_TIME: string;
}

export interface ScreeningsError {
    notFound: boolean;
    message: string;
}

export type { ListValue };