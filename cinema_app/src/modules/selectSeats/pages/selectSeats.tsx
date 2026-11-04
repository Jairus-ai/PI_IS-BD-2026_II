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
import { useNavigate, useParams } from 'react-router';
import useNotifications from '../../../hooks/useNotifications';
import { useSeats } from '../hooks/useSeats';
import { markSeatAsAvailable, markSeatAsUnavailable } from '../services/seatsService';

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

    const { seats: rawSeats, isLoadingSeats } = useSeats(validScreeningId);
    const seats = rawSeats as Seat[];

    const queryClient = useQueryClient();
    const notifications = useNotifications();

    const [seatList, setSeatList] = React.useState<number[]>([]);
    const [pendingSeats, setPendingSeats] = React.useState<number[]>([]);

    const seatByPosition = React.useMemo(() => {
        const map = new Map<string, Seat>();
        for (const seat of seats) {
            map.set(`${rowToIndex(seat.SEAT_ROW)}-${seat.SEAT_NUMBER - 1}`, seat);
        }
        return map;
    }, [seats]);

    const changeSeatDisponibility = async (seatId: number) => {
        if (validScreeningId === null || pendingSeats.includes(seatId)) {
            return;
        }

        const isSelected = seatList.includes(seatId);
        setPendingSeats((previous) => [...previous, seatId]);

        try {
            if (isSelected) {
                await markSeatAsAvailable(validScreeningId, seatId);
                setSeatList((previous) => previous.filter((s) => s !== seatId));
            } else {
                await markSeatAsUnavailable(validScreeningId, seatId);
                setSeatList((previous) => [...previous, seatId]);
            }
            await queryClient.invalidateQueries({ queryKey: ['seats', validScreeningId] });
        } catch (error) {
            notifications.show(
                `No se pudo actualizar el asiento. Motivo: ${(error as Error).message}`,
                { severity: 'error', autoHideDuration: 3000 },
            );
        } finally {
            setPendingSeats((previous) => previous.filter((s) => s !== seatId));
        }
    };

    const handleBack = async () => {
        if (validScreeningId !== null) {
            await Promise.allSettled(
                seatList.map((seatId) => markSeatAsAvailable(validScreeningId, seatId)),
            );
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
                                    disabled={!(isAvailable || isSelected) || isPending}
                                    onClick={() => {
                                        void changeSeatDisponibility(seat.ID_SEAT);
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
                    onClick={() => navigate('/purchaseConfirmationEmail', {state:{seatList, screeningId: validScreeningId}})}
                >
                    Continuar
                </Button>
            </Stack>
        </Box>
    );
}