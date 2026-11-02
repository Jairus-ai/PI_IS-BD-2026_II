import * as React from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { useParams } from 'react-router';
import { useSeats } from '../hooks/useSeats';
import {
    markSeatAsUnavailable, 
    markSeatAsAvailable
} from '../services/seatsService';

//temporal values while the functions for screenings are not implemented, these values should be obtained from the screening data
const ROWS = 10;
const COLS = 10;

let SELECTED_SEATS: number[] = [];
interface Seat {
  SEAT_ROW: string | number;
  SEAT_NUMBER: number;
  ID_SEAT: number;
  SEAT_AVAILABLE: number;
}

function rowToIndex(row: string | number): number {
  const asNumber = Number(row);
  if (Number.isInteger(asNumber)) return asNumber - 1;
  return String(row).toUpperCase().codePointAt(0)! - 65;
}

function handleSelectSeat(seat: Seat | undefined, screeningId: number | null) {
    if(seat) {
        if(seat.SEAT_AVAILABLE === 1) {
            void markSeatAsUnavailable(screeningId, seat.ID_SEAT);
            const seatId = seat?.ID_SEAT;
            SELECTED_SEATS.push(seatId);
        } else if (seat.SEAT_AVAILABLE === 0 && SELECTED_SEATS.includes(seat.ID_SEAT)) {
            void markSeatAsAvailable(screeningId, seat.ID_SEAT);
            const seatId = seat?.ID_SEAT;
            SELECTED_SEATS = SELECTED_SEATS.filter((id) => id !== seatId);
        }
      } 
}

export default function ShowSeats() {
  const { screeningId } = useParams();
  const id = Number(screeningId);
  const validId = Number.isInteger(id) ? id : null;

  const { seats: rawSeats, isLoadingSeats } = useSeats(validId);
  const seats = rawSeats as Seat[];

  const seatByPosition = React.useMemo(() => {
    const map = new Map<string, Seat>();
    for (const seat of seats) {
      map.set(`${rowToIndex(seat.SEAT_ROW)}-${seat.SEAT_NUMBER - 1}`, seat);
    }
    return map;
  }, [seats]);

  if (validId === null) {
    return <Alert severity="error">Función no válida</Alert>;
  }

  if (isLoadingSeats) {
    return <CircularProgress />;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 40px)`,
        gridTemplateRows: `repeat(${ROWS}, 40px)`,
        gap: 1,
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: ROWS * COLS }, (_, index) => {
        const row = Math.floor(index / COLS);
        const col = index % COLS;
        const seat = seatByPosition.get(`${row}-${col}`);
        const isntAvailable = seat?.SEAT_AVAILABLE === 0;
        const isSelected = seat !== undefined && SELECTED_SEATS.includes(seat.ID_SEAT);
        let seatColor = 'common.white';
        if
         (isSelected) {
          seatColor = 'primary.main';
        } else if (isntAvailable && !isSelected) {
          seatColor = 'grey.400';
        }

        return (
            <Box
            key={`${row}-${col}`}
            onClick={() => handleSelectSeat(seat, validId)}
            sx={{
                bgcolor: seatColor,
                border: '1px solid',
                borderColor: 'grey.400',
                borderRadius: 1,
                cursor: seat ? 'pointer' : 'default',
            }}
            />
        );
        })}
    </Box>
  );
}