import * as React from 'react';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MovieIcon from '@mui/icons-material/Movie';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useNavigate, useParams } from 'react-router';
import { useMovieScreenings } from '../hooks/useMovieScreenings';
import type { ListValue, Movie, Screening, ScreeningsError } from '../types/screenings';

interface LocationGroup {
    id: number;
    name: string;
    items: Screening[];
}

const ALL_LOCATIONS = 'all';
const POSTER_WIDTH = 160;
const POSTER_HEIGHT = 240;

const TIME_FORMAT = new Intl.DateTimeFormat('es-CR', { hour: '2-digit', minute: '2-digit', hour12: true });
const DAY_FORMAT = new Intl.DateTimeFormat('es-CR', { weekday: 'short', day: 'numeric', month: 'short' });

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const pad = (value: number) => String(value).padStart(2, '0');
const isValidDate = (date: Date): boolean => !Number.isNaN(date.getTime());
const byStartTime = (a: Screening, b: Screening) => Date.parse(a.START_TIME) - Date.parse(b.START_TIME);

function formatList(value: ListValue): string {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean).join(', ') || '—';
    }
    const raw = String(value ?? '').trim();
    if (!raw) return '—';

    if (/[,;|]/.test(raw)) {
        return raw.split(/\s*[,;|]\s*/).filter(Boolean).join(', ');
    }

    return raw
        .replace(/Dolby\s+Atmos/gi, 'Dolby_Atmos')
        .split(/\s+/)
        .map((item) => item.replaceAll('_', ' '))
        .join(', ');
}

function formatTime(startTime: string): string {
    const date = new Date(startTime);
    return isValidDate(date) ? TIME_FORMAT.format(date) : '--:--';
}

// YYYY-MM-DD en hora local del navegador
function toDayKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getScreeningDayKey(startTime: string): string | null {
    const date = new Date(startTime);
    return isValidDate(date) ? toDayKey(date) : null;
}

function formatDayLabel(dayKey: string): string {
    const [year, month, day] = dayKey.split('-').map(Number);
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    if (dayKey === toDayKey(today)) return 'Hoy';
    if (dayKey === toDayKey(tomorrow)) return 'Mañana';

    const parts = Object.fromEntries(
        DAY_FORMAT.formatToParts(new Date(year, month - 1, day)).map((part) => [part.type, part.value]),
    );
    return `${capitalize(parts.weekday)} ${parts.day} ${capitalize(parts.month)}`.replaceAll('.', '');
}

function DetailLine({ label, value }: Readonly<{ label: string; value: ListValue }>) {
    return (
        <Typography variant="body2">
            <b>{label}:</b> {formatList(value)}
        </Typography>
    );
}

function PosterFallback() {
    return (
        <Box
            sx={{
                width: POSTER_WIDTH,
                height: POSTER_HEIGHT,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: { xs: 'center', sm: 'flex-start' },
                borderRadius: 1,
                bgcolor: 'action.hover',
                color: 'text.secondary',
            }}
        >
            <MovieIcon sx={{ fontSize: 64 }} />
        </Box>
    );
}

function MovieInfo({ movie }: Readonly<{ movie: Movie }>) {
    const [posterFailed, setPosterFailed] = React.useState(false);

    return (
        <Paper variant="outlined" sx={{ bgcolor: 'background.paper', p: 2, mb: 3, borderRadius: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                {movie.POSTER && !posterFailed ? (
                    <Box
                        component="img"
                        src={movie.POSTER}
                        alt={`Póster de ${movie.MOVIE_TITLE}`}
                        onError={() => setPosterFailed(true)}
                        sx={{ width: POSTER_WIDTH, alignSelf: { xs: 'center', sm: 'flex-start' }, borderRadius: 1 }}
                    />
                ) : (
                    <PosterFallback />
                )}
                <Stack spacing={1}>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {movie.MOVIE_TITLE}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {movie.PUBLISHING_YEAR} · {movie.MOVIE_DURATION} min · {movie.RATING_NAME} ({movie.RATING_CODE})
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {movie.SYNOPSIS ?? 'Sin sinopsis disponible.'}
                    </Typography>
                    <DetailLine label="Géneros" value={movie.GENRES} />
                    <DetailLine label="Director" value={movie.DIRECTORS} />
                    <DetailLine label="Idiomas" value={movie.LANGUAGES} />
                    <DetailLine label="Formatos" value={movie.FORMATS} />
                </Stack>
            </Stack>
        </Paper>
    );
}

const SCREEN_TYPE_LABELS: Record<string, string> = {
    REG: 'Regular',
    VIP: 'VIP',
    IMAX: 'IMAX',
    '4DX': '4DX',
};

const LANGUAGE_LABELS: Record<string, string> = {
    ENGLISH: 'Inglés',
    SPANISH: 'Español',
    FRENCH: 'Francés',
    JAPANESE: 'Japonés',
    KOREAN: 'Coreano',
    PORTUGUESE: 'Portugués',
    GERMAN: 'Alemán',
    ITALIAN: 'Italiano',
};

const FORMAT_LABELS: Record<string, string> = {
    SUBTITLE: 'Subtitulada',
    SUBTITLED: 'Subtitulada',
    SUB: 'Subtitulada',
    DUBBED: 'Doblada',
    DUB: 'Doblada',
    ORIGINAL: 'Idioma original',
    OG: 'Idioma original',
};

function translateValue(value: string, dictionary: Record<string, string>): string {
    const clean = String(value ?? '').trim();
    return dictionary[clean.toUpperCase()] ?? clean;
}

function ShowtimeRow({ screening, onSelect }: Readonly<{ screening: Screening; onSelect: () => void }>) {
    const formatLabel = translateValue(screening.MOVIE_FORMAT, FORMAT_LABELS);
    const languageLabel = translateValue(screening.MOVIE_LANGUAGE, LANGUAGE_LABELS);
    const screenTypeLabel = translateValue(screening.SCREEN_TYPE, SCREEN_TYPE_LABELS);

    return (
        <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, py: 1.5 }}
        >
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 120 }}>
                    {formatTime(screening.START_TIME)}
                </Typography>
                <Chip label={formatLabel} color="primary" size="small" sx={{ fontWeight: 700 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {languageLabel} · Sala {screening.ID_SCREEN} · {screenTypeLabel}
                </Typography>
            </Stack>
            <Button variant="contained" disableElevation onClick={onSelect}>
                Elegir asientos
            </Button>
        </Stack>
    );
}

function LocationSchedule({ group, onSelect }: Readonly<{ group: LocationGroup; onSelect: (id: number) => void }>) {
    return (
        <Paper variant="outlined" sx={{ bgcolor: 'background.paper', px: 2, pt: 2, pb: 1, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <LocationOnIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {group.name}
                </Typography>
            </Stack>
            {group.items.map((screening, index) => (
                <React.Fragment key={screening.ID_SCREENING}>
                    {index > 0 && <Divider />}
                    <ShowtimeRow screening={screening} onSelect={() => onSelect(screening.ID_SCREENING)} />
                </React.Fragment>
            ))}
        </Paper>
    );
}

function MovieScreeningsContent({ idMovie }: Readonly<{ idMovie: number }>) {
    const navigate = useNavigate();

    const {
        movie: rawMovie,
        screenings: rawScreenings,
        locations,
        selectedLocation,
        setSelectedLocation,
        loading,
        error: rawError,
        hasNoScreenings,
        hasNoMatches,
        reload,
    } = useMovieScreenings(idMovie);

    const movie = rawMovie as Movie | null;
    const screenings = rawScreenings as Screening[];
    const error = rawError as ScreeningsError | null;

    const [selectedDay, setSelectedDay] = React.useState('');

    // Días con funciones según la sucursal activa (screenings ya viene filtrado por el hook)
    const days = React.useMemo(() => {
        const keys = new Set<string>();
        screenings.forEach((screening) => {
            const key = getScreeningDayKey(screening.START_TIME);
            if (key) keys.add(key);
        });
        return [...keys].sort();
    }, [screenings]);

    const activeDay = days.includes(selectedDay) ? selectedDay : (days[0] ?? '');

    const locationGroups = React.useMemo(() => {
        const groups = new Map<number, LocationGroup>();

        screenings
            .filter((screening) => getScreeningDayKey(screening.START_TIME) === activeDay)
            .sort(byStartTime)
            .forEach((screening) => {
                const group = groups.get(screening.ID_LOCATION) ?? {
                    id: screening.ID_LOCATION,
                    name: screening.LOCATION_NAME,
                    items: [],
                };
                group.items.push(screening);
                groups.set(screening.ID_LOCATION, group);
            });

        return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [screenings, activeDay]);

    const goHome = () => {
        void navigate('/');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error?.notFound) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="warning" action={<Button color="inherit" onClick={goHome}>Volver</Button>}>
                    La película solicitada no existe.
                </Alert>
            </Box>
        );
    }

    if (error || !movie) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error" action={<Button color="inherit" onClick={reload}>Reintentar</Button>}>
                    {error?.message ?? 'No se pudo cargar la información de la película.'}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <MovieInfo key={movie.ID_MOVIE} movie={movie} />

            <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2 }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Funciones disponibles
                </Typography>
                {!hasNoScreenings && (
                    <TextField
                        select
                        size="small"
                        label="Sucursal"
                        value={selectedLocation || ALL_LOCATIONS}
                        onChange={(event) =>
                            setSelectedLocation(event.target.value === ALL_LOCATIONS ? '' : event.target.value)
                        }
                        sx={{ minWidth: 240 }}
                    >
                        <MenuItem value={ALL_LOCATIONS}>Todas las sucursales</MenuItem>
                        {locations.map((location: { ID_LOCATION: number; LOCATION_NAME: string }) => (
                            <MenuItem key={location.ID_LOCATION} value={String(location.ID_LOCATION)}>
                                {location.LOCATION_NAME}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            </Stack>

            {hasNoScreenings && (
                <Alert severity="info">Esta película no tiene funciones programadas por el momento.</Alert>
            )}

            {hasNoMatches && (
                <Alert severity="info">No hay funciones programadas en la sucursal seleccionada.</Alert>
            )}

            {days.length > 0 && (
                <Tabs
                    value={activeDay}
                    onChange={(_, value: string) => setSelectedDay(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="Días con funciones"
                    sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                    {days.map((day) => (
                        <Tab key={day} value={day} label={formatDayLabel(day)} />
                    ))}
                </Tabs>
            )}

            <Stack spacing={2}>
                {locationGroups.map((group) => (
                    <LocationSchedule
                        key={group.id}
                        group={group}
                        onSelect={(screeningId) => {
                            void navigate(`/seats/${screeningId}`);
                        }}
                    />
                ))}
            </Stack>

            <Stack direction="row" sx={{ justifyContent: 'center', mt: 4 }}>
                <Button variant="contained" color="inherit" disableElevation onClick={goHome}>
                    Atrás
                </Button>
            </Stack>
        </Box>
    );
}

export default function MovieScreeningsPage() {
    const { idMovie } = useParams();
    const idMovieNumber = Number(idMovie);

    if (!Number.isInteger(idMovieNumber)) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error">Película no válida</Alert>
            </Box>
        );
    }

    return <MovieScreeningsContent idMovie={idMovieNumber} />;
}