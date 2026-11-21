import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { isAxiosError } from 'axios';
import { useNavigate, useParams } from 'react-router';
import useNotifications from '../../../hooks/useNotifications';
import { useSeats } from '../hooks/useSeats';
import {
    cancelReservation,
    releaseSeat,
    reserveSeat
} from '../services/seatsService';
import { getErrorMessage } from '../../../services/errorMessage';

//temporal values while the functions for screenings are not implemented, these values should be obtained from the screening data
const ROWS = 10;
const COLS = 10;
const SEAT_SIZE = 32;

const COLORS = {
    available: 'grey.300',
    occupied: 'grey.700',
    selected: 'primary.dark',
} as const;

interface Seat {
    SEAT_ROW: string | number;
    SEAT_NUMBER: number;
    ID_SEAT: number;
    SEAT_AVAILABLE: number;
}

interface Reservation {
    reservedUntil: string;
    seats: number[];
}

interface ReservationResponse {
    reservedUntil: string;
}

const RESERVATION_EXPIRED_CODE = 'RESERVATION_EXPIRED';
const RESERVATION_EXPIRED_MESSAGE = 'Tu reserva de asientos expiró. Selecciona tus asientos de nuevo.';

function isReservationExpired(error: unknown): boolean {
    return isAxiosError<{ code?: string }>(error) && error.response?.data?.code === RESERVATION_EXPIRED_CODE;
}

function formatRemainingTime(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    return `${minutes}:${seconds}`;
}

function rowToIndex(row: string | number): number {
    const asNumber = Number(row);
    if (Number.isInteger(asNumber)) {
        return asNumber - 1;
    }

    const rowCode = String(row).toUpperCase().codePointAt(0);
    return rowCode !== undefined ? rowCode - 65 : -1;
}

const rowLabel = (index: number) => String.fromCodePoint(65 + index);

function DisponibilityChartItem({ color, label }: Readonly<{ color: string; label: string }>) {
    return (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 20, height: 20, borderRadius: 0.75, bgcolor: color }} />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {label}
            </Typography>
        </Stack>
    );
}

export default function ShowSeats() {
    const navigate = useNavigate();
    const { screeningId } = useParams();
    const idScreeningNumber = Number(screeningId);
    const validScreeningId = Number.isInteger(idScreeningNumber) ? idScreeningNumber : null;

    const { seats: rawSeats, reservation: rawReservation, isLoadingSeats } = useSeats(validScreeningId);
    const { seats: rawSeats, reservation: rawReservation, isLoadingSeats } = useSeats(validScreeningId);
    const seats = rawSeats as Seat[];
    const reservation = rawReservation as Reservation | null;
    const reservation = rawReservation as Reservation | null;

    const queryClient = useQueryClient();
    const notifications = useNotifications();

    const [seatList, setSeatList] = React.useState<number[]>([]);
    const [pendingSeats, setPendingSeats] = React.useState<number[]>([]);
    const [reservedUntil, setReservedUntil] = React.useState<number | null>(null);
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        setSeatList(reservation?.seats ?? []);
        setReservedUntil(reservation
            ? Date.parse(reservation.reservedUntil)
            : null);
    }, [reservation]);

    const handleExpiredReservation = React.useCallback(() => {
        setSeatList([]);
        setReservedUntil(null);
        notifications.show(RESERVATION_EXPIRED_MESSAGE, {
            severity: 'warning',
            autoHideDuration: 5000,
        });
        void queryClient.invalidateQueries({ queryKey: ['seats', validScreeningId] });
    }, [notifications, queryClient, validScreeningId]);

    React.useEffect(() => {
        if (reservedUntil === null)
            return;

        setNow(Date.now());

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [reservedUntil]);

    const remainingTime = reservedUntil === null
        ? null
        : reservedUntil - now;

    React.useEffect(() => {
        if (remainingTime !== null && remainingTime <= 0)
            handleExpiredReservation();
    }, [remainingTime, handleExpiredReservation]);
    const [reservedUntil, setReservedUntil] = React.useState<number | null>(null);
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        setSeatList(reservation?.seats ?? []);
        setReservedUntil(reservation
            ? Date.parse(reservation.reservedUntil)
            : null);
    }, [reservation]);

    const handleExpiredReservation = React.useCallback(() => {
        setSeatList([]);
        setReservedUntil(null);
        notifications.show(RESERVATION_EXPIRED_MESSAGE, {
            severity: 'warning',
            autoHideDuration: 5000,
        });
        void queryClient.invalidateQueries({ queryKey: ['seats', validScreeningId] });
    }, [notifications, queryClient, validScreeningId]);

    React.useEffect(() => {
        if (reservedUntil === null)
            return;

        setNow(Date.now());

        const interval = setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [reservedUntil]);

    const remainingTime = reservedUntil === null
        ? null
        : reservedUntil - now;

    React.useEffect(() => {
        if (remainingTime !== null && remainingTime <= 0)
            handleExpiredReservation();
    }, [remainingTime, handleExpiredReservation]);

    const seatByPosition = React.useMemo(() => {
        const map = new Map<string, Seat>();
        for (const seat of seats) {
            map.set(`${rowToIndex(seat.SEAT_ROW)}-${seat.SEAT_NUMBER - 1}`, seat);
        }
        return map;
    }, [seats]);

    const changeSeatDisponibility = async (seat: Seat) => {
        const seatId = seat.ID_SEAT;

    const changeSeatDisponibility = async (seat: Seat) => {
        const seatId = seat.ID_SEAT;

        if (validScreeningId === null || pendingSeats.includes(seatId)) {
            return;
        }

        const isSelected = seatList.includes(seatId);
        const isOccupied = Number(seat.SEAT_AVAILABLE) !== 1 && !isSelected;

        const isOccupied = Number(seat.SEAT_AVAILABLE) !== 1 && !isSelected;

        setPendingSeats((previous) => [...previous, seatId]);

        try {
            if (isOccupied) {
                notifications.show('Este asiento está bloqueado.', {
                    severity: 'warning',
                    autoHideDuration: 3000,
                });
            } else if (isSelected) {
                const result = await releaseSeat(validScreeningId, seatId) as ReservationResponse;

                setSeatList((previous) => previous.filter((s) => s !== seatId));
                setReservedUntil(Date.parse(result.reservedUntil));
                setReservedUntil(Date.parse(result.reservedUntil));
            } else {
                const result = await reserveSeat(validScreeningId, seatId) as ReservationResponse;

                const result = await reserveSeat(validScreeningId, seatId) as ReservationResponse;

                setSeatList((previous) => [...previous, seatId]);
                setReservedUntil(Date.parse(result.reservedUntil));
                setReservedUntil(Date.parse(result.reservedUntil));
            }
        } catch (error) {
            if (isReservationExpired(error)) {
                handleExpiredReservation();
            } else {
                notifications.show(
                    getErrorMessage(error, 'No se pudo actualizar el asiento'),
                    {
                        severity: 'error',
                        autoHideDuration: 3000,
                    },
                );
            }
        } finally {
            await queryClient.invalidateQueries({ queryKey: ['seats', validScreeningId] });
            setPendingSeats((previous) => previous.filter((s) => s !== seatId));
        }
    };

    const handleBack = async () => {
        if (validScreeningId !== null) {
            await cancelReservation(validScreeningId).catch(() => undefined);
            await cancelReservation(validScreeningId).catch(() => undefined);
        }
        void navigate('/');
    };

    if (validScreeningId === null) {
        return <Alert severity="error">Función no válida</Alert>;
    }

    if (isLoadingSeats) {
        return <CircularProgress />;
    }

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                Selección de Asientos
            </Typography>

            <Paper
                variant="outlined"
                sx={{ bgcolor: 'grey.200', px: 3, py: 1.5, mb: 4, borderRadius: 2 }}
            >
                <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}
                >
                    <Typography variant="caption"><b>Película:</b> *título*</Typography>
                    <Typography variant="caption"><b>Cine/Sucursal:</b> *nombre del cine - sucursal*</Typography>
                    <Typography variant="caption"><b>Sala:</b> *número de sala - tipo*</Typography>
                    <Typography variant="caption"><b>Formato:</b> *formato de la película*</Typography>
                </Stack>
            </Paper>


            {remainingTime !== null && (
                <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 700, mb: 2 }}>
                    Tus asientos están reservados por {formatRemainingTime(remainingTime)}
                </Typography>
            )}

            <Stack sx={{ alignItems: 'center', mb: 2 }}>
                <Box sx={{ width: '60%', maxWidth: 420, height: 10, bgcolor: 'grey.700', borderRadius: 0.5 }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Pantalla
                </Typography>
            </Stack>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: `24px repeat(${COLS}, ${SEAT_SIZE}px)`,
                    gap: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Box />
                {Array.from({ length: COLS }, (_, col) => (
                    <Typography key={`h-${col}`} variant="body2" sx={{ textAlign: 'center' }}>
                        {col + 1}
                    </Typography>
                ))}

                {Array.from({ length: ROWS }, (_, row) => (
                    <React.Fragment key={`row-${row}`}>
                        <Typography variant="body2" sx={{ textAlign: 'center' }}>
                            {rowLabel(row)}
                        </Typography>

                        {Array.from({ length: COLS }, (_, col) => {
                            const seat = seatByPosition.get(`${row}-${col}`);

                            if (!seat) {
                                return (
                                    <Box
                                        key={`${row}-${col}`}
                                        sx={{ width: SEAT_SIZE, height: SEAT_SIZE }}
                                    />
                                );
                            }

                            const isAvailable = seat.SEAT_AVAILABLE === 1;
                            const isSelected = seatList.includes(seat.ID_SEAT);
                            const isPending = pendingSeats.includes(seat.ID_SEAT);

                            let color: string = COLORS.occupied;
                            if (isSelected) {
                                color = COLORS.selected;
                            } else if (isAvailable) {
                                color = COLORS.available;
                            }

                            return (
                                <ButtonBase
                                    key={`${row}-${col}`}
                                    disabled={isPending}
                                    disabled={isPending}
                                    onClick={() => {
                                        void changeSeatDisponibility(seat);
                                        void changeSeatDisponibility(seat);
                                    }}
                                    aria-label={`Asiento ${rowLabel(row)}${col + 1}`}
                                    aria-pressed={isSelected}
                                    sx={{
                                        width: SEAT_SIZE,
                                        height: SEAT_SIZE,
                                        borderRadius: 0.75,
                                        bgcolor: color,
                                    }}
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
            </Box>

            <Paper
                variant="outlined"
                sx={{ bgcolor: 'grey.100', mx: 'auto', mt: 5, mb: 3, px: 4, py: 1.5, maxWidth: 520, borderRadius: 2 }}
            >
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <DisponibilityChartItem color={COLORS.available} label="Disponible" />
                    <DisponibilityChartItem color={COLORS.occupied} label="Ocupado" />
                    <DisponibilityChartItem color={COLORS.selected} label="Seleccionado" />
                </Stack>
            </Paper>

            {remainingTime !== null && (
                <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 700, mb: 2 }}>
                    Tus asientos están reservados por {formatRemainingTime(remainingTime)}
                </Typography>
            )}

            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    color="inherit"
                    disableElevation
                    onClick={() => {
                        void handleBack();
                    }}
                >
                    Atrás
                </Button>
                <Button
                    variant="contained"
                    disableElevation
                    disabled={seatList.length === 0}
                    onClick={() => {
                        void navigate('/payment');
                    }}
                >
                    Continuar
                </Button>
            </Stack>
        </Box>
    );
}