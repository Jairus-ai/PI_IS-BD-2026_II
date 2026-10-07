import * as React from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useMovies } from './useMovies';
import useNotifications from '../../../hooks/useNotifications';
import type { AudiovisualFormat, Director, Genre, Language, MovieDetail, Rating } from '../types/movies';
import { parseLanguageEntry, posterUrl, readServerErrors, splitNames } from '../utils/movieFormUtils';
import { validateAll } from '../utils/movieFormValidation';
import type { ServerErrors } from '../utils/movieFormUtils';

export interface UseMovieFormArgs {
  movieId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function useMovieForm({ movieId, open, onClose, onSaved }: UseMovieFormArgs) {
  const isCreate = movieId == null;
  const notifications = useNotifications();
  const {
    movieDetail,
    isLoadingDetail,
    genres,
    ratings,
    languages,
    formats,
    directors,
    isLoadingCatalogs,
    uploadPoster,
    createMovie,
    updateMovie,
    isCreatingMovie,
    isUpdatingMovie,
  } = useMovies(1, open && !isCreate ? movieId : null);

  const [title, setTitle] = React.useState('');
  const [synopsis, setSynopsis] = React.useState('');
  const [yearDate, setYearDate] = React.useState<Dayjs | null>(null);
  const [durationTime, setDurationTime] = React.useState<Dayjs | null>(null);
  const [ratingId, setRatingId] = React.useState<number | ''>('');
  const [genreIds, setGenreIds] = React.useState<Genre[]>([]);
  const [directorIds, setDirectorIds] = React.useState<Director[]>([]);
  const [formatIds, setFormatIds] = React.useState<AudiovisualFormat[]>([]);
  const [originalLangs, setOriginalLangs] = React.useState<Language[]>([]);
  const [dubLangs, setDubLangs] = React.useState<Language[]>([]);
  const [subLangs, setSubLangs] = React.useState<Language[]>([]);
  const [existingPoster, setExistingPoster] = React.useState<string | null>(null);
  const [posterFile, setPosterFile] = React.useState<File | null>(null);
  const [posterPreview, setPosterPreview] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<ServerErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const touchedRef = React.useRef<Record<string, boolean>>({});
  const [uploading, setUploading] = React.useState(false);

  const detail = movieDetail as MovieDetail | null;
  const catalogs = { genres, ratings, languages, formats, directors };
  const saving = uploading || isCreatingMovie || isUpdatingMovie;
  const loading = !isCreate && (isLoadingDetail || isLoadingCatalogs);

  const snapshot = {
    title, synopsis, yearDate, durationTime, ratingId,
    genreIds, directorIds, formatIds, originalLangs,
    posterFile, existingPoster, isCreate,
  };

  const validateAndSet = (merged: typeof snapshot, touchedMap: Record<string, boolean>) => {
    const all = validateAll(merged);
    const next: ServerErrors = {};
    for (const key of Object.keys(all)) {
      if (touchedMap[key]) next[key] = all[key];
    }
    setFieldErrors(next);
  };

  const touchAndValidate = (name: string, overrides: Partial<typeof snapshot> = {}) => {
    const nt = { ...touchedRef.current, [name]: true };
    touchedRef.current = nt;
    setTouched(nt);
    validateAndSet({ ...snapshot, ...overrides }, nt);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTitle(v);
    touchAndValidate('MOVIE_TITLE', { title: v });
  };

  const handleSynopsisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSynopsis(v);
    touchAndValidate('SYNOPSIS', { synopsis: v });
  };

  const handleBlur = (name: string) => () => {
    touchAndValidate(name);
  };

  const handleYearChange = (v: Dayjs | null) => {
    setYearDate(v);
    touchAndValidate('PUBLISHING_YEAR', { yearDate: v });
  };

  const handleDurationChange = (v: Dayjs | null) => {
    setDurationTime(v);
    touchAndValidate('MOVIE_DURATION', { durationTime: v });
  };

  const handleRatingChange = (v: number) => {
    setRatingId(v);
    touchAndValidate('ID_RATING');
  };

  const handleGenresChange = (v: Genre[]) => {
    setGenreIds(v);
    touchAndValidate('GENRE_IDS', { genreIds: v });
  };

  const handleDirectorsChange = (v: Director[]) => {
    setDirectorIds(v);
    touchAndValidate('DIRECTOR_IDS', { directorIds: v });
  };

  const handleFormatsChange = (v: AudiovisualFormat[]) => {
    setFormatIds(v);
    touchAndValidate('FORMAT_IDS', { formatIds: v });
  };

  const handleOriginalLangsChange = (v: Language[]) => {
    setOriginalLangs(v);
    touchAndValidate('LANGUAGES_ORIGINAL', { originalLangs: v });
  };

  const handlePosterChange = (f: File | null) => {
    setPosterFile(f);
    touchAndValidate('POSTER', { posterFile: f });
  };

  const resetTouched = () => {
    touchedRef.current = {};
    setTouched({});
  };

  React.useEffect(() => {
    if (!open) return;
    resetTouched();
    setFieldErrors({});
    setPosterFile(null);
    if (isCreate || !detail || isLoadingCatalogs) {
      if (isCreate) {
        setTitle('');
        setSynopsis('');
        setYearDate(null);
        setDurationTime(null);
        setRatingId('');
        setGenreIds([]);
        setDirectorIds([]);
        setFormatIds([]);
        setOriginalLangs([]);
        setDubLangs([]);
        setSubLangs([]);
        setExistingPoster(null);
      }
      return;
    }

    setTitle(detail.MOVIE_TITLE ?? '');
    setSynopsis(detail.SYNOPSIS ?? '');
    setYearDate(detail.PUBLISHING_YEAR ? dayjs(`${detail.PUBLISHING_YEAR}-01-01`) : null);
    if (detail.MOVIE_DURATION != null) {
      const h = Math.floor(detail.MOVIE_DURATION / 60);
      const mnt = detail.MOVIE_DURATION % 60;
      setDurationTime(dayjs().startOf('day').hour(h).minute(mnt));
    } else {
      setDurationTime(null);
    }

    const ratingList = ratings as Rating[];
    const matchedRating = ratingList.find((r) => r.RATING_CODE === detail.RATING_CODE);
    setRatingId(matchedRating ? matchedRating.ID_RATING : '');

    const genreList = genres as Genre[];
    const genreNames = splitNames(detail.GENRES);
    setGenreIds(genreList.filter((g) => genreNames.includes(g.GENRE_NAME)));

    const directorList = directors as Director[];
    const directorNames = splitNames(detail.DIRECTORS);
    setDirectorIds(
      directorList.filter((d) => directorNames.includes(`${d.DIRECTOR_FIRST_NAME} ${d.DIRECTOR_LAST_NAME}`))
    );

    const formatList = formats as AudiovisualFormat[];
    const formatNames = splitNames(detail.FORMATS);
    setFormatIds(
      formatList.filter((f) => formatNames.includes(`${f.VIDEO_FORMAT_NAME} ${f.AUDIO_FORMAT_NAME}`))
    );

    const langList = languages as Language[];
    const langEntries = splitNames(detail.LANGUAGES);
    const og: Language[] = [];
    const dub: Language[] = [];
    const sub: Language[] = [];
    for (const entry of langEntries) {
      const parsed = parseLanguageEntry(entry);
      if (!parsed) continue;
      const found = langList.find((l) => l.LANGUAGE_NAME === parsed.name);
      if (!found) continue;
      if (parsed.type === 'OG' && !og.some((l) => l.ISO_CODE === found.ISO_CODE)) og.push(found);
      else if (parsed.type === 'DUB' && !dub.some((l) => l.ISO_CODE === found.ISO_CODE)) dub.push(found);
      else if (parsed.type === 'SUB' && !sub.some((l) => l.ISO_CODE === found.ISO_CODE)) sub.push(found);
    }
    setOriginalLangs(og);
    setDubLangs(dub);
    setSubLangs(sub);

    setExistingPoster(detail.POSTER ?? null);
  }, [open, detail, isLoadingCatalogs, genres, ratings, languages, formats, directors, isCreate]);

  React.useEffect(() => {
    if (!posterFile) {
      setPosterPreview(null);
      return;
    }
    const url = URL.createObjectURL(posterFile);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [posterFile]);

  const previewSrc = posterPreview ?? (!isCreate ? posterUrl(existingPoster) : undefined);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const allTouched: Record<string, boolean> = {
      MOVIE_TITLE: true, SYNOPSIS: true, PUBLISHING_YEAR: true, MOVIE_DURATION: true,
      ID_RATING: true, GENRE_IDS: true, DIRECTOR_IDS: true, FORMAT_IDS: true,
      LANGUAGES_ORIGINAL: true, POSTER: true,
    };
    touchedRef.current = allTouched;
    setTouched(allTouched);
    const all = validateAll(snapshot);
    setFieldErrors(all);
    if (Object.keys(all).length > 0) return;

    try {
      setUploading(true);
      let posterPath = isCreate ? '' : (existingPoster ?? '');
      if (posterFile) {
        const uploadResult = await uploadPoster(posterFile);
        posterPath = uploadResult?.data?.poster as string;
      }
      setUploading(false);

      const payload = {
        MOVIE_TITLE: title.trim(),
        PUBLISHING_YEAR: (yearDate as Dayjs).year(),
        SYNOPSIS: synopsis.trim(),
        MOVIE_DURATION: (durationTime as Dayjs).hour() * 60 + (durationTime as Dayjs).minute(),
        POSTER: posterPath,
        ID_RATING: ratingId as number,
        GENRE_IDS: genreIds.map((g) => g.ID_GENRE),
        DIRECTOR_IDS: directorIds.map((d) => d.ID_DIRECTOR),
        FORMAT_IDS: formatIds.map((f) => f.ID_AUDIOVISUAL_FORMAT),
        LANGUAGES: [
          ...originalLangs.map((l) => ({ ISO_CODE: l.ISO_CODE, LANGUAGE_TYPE: 'OG' })),
          ...dubLangs.map((l) => ({ ISO_CODE: l.ISO_CODE, LANGUAGE_TYPE: 'DUB' })),
          ...subLangs.map((l) => ({ ISO_CODE: l.ISO_CODE, LANGUAGE_TYPE: 'SUB' })),
        ],
      };

      if (isCreate) {
        await createMovie(payload);
        notifications.show('Película creada correctamente.', { severity: 'success', autoHideDuration: 3000 });
      } else {
        await updateMovie(movieId as number, payload);
        notifications.show('Película actualizada correctamente.', { severity: 'success', autoHideDuration: 3000 });
      }
      setFieldErrors({});
      onClose();
      onSaved?.();
    } catch (submitError) {
      setUploading(false);
      const serverErrors = readServerErrors(submitError);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
      } else {
        notifications.show(`Error al guardar la película: ${(submitError as Error).message}`, {
          severity: 'error',
          autoHideDuration: 5000,
        });
      }
    }
  };

  return {
    isCreate, loading, saving, uploading,
    title, synopsis, yearDate, durationTime, ratingId,
    genreIds, directorIds, formatIds, originalLangs, dubLangs, subLangs,
    existingPoster, posterFile, posterPreview, previewSrc,
    fieldErrors, touched, detail, catalogs,
    setYearDate, setDurationTime, setRatingId,
    setGenreIds, setDirectorIds, setFormatIds,
    setOriginalLangs, setDubLangs, setSubLangs, setPosterFile,
    setTitle, setSynopsis,
    validateAndSet, snapshot,
    touchAndValidate,
    handleTitleChange, handleSynopsisChange, handleBlur,
    handleYearChange, handleDurationChange, handleRatingChange,
    handleGenresChange, handleDirectorsChange, handleFormatsChange,
    handleOriginalLangsChange, handlePosterChange,
    handleSubmit,
  };
}

export type MovieForm = ReturnType<typeof useMovieForm>;
