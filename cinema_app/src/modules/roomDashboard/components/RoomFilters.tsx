import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { type Dayjs } from 'dayjs';
import type { RoomLocation, RoomOption } from '../types/roomDashboard';

interface RoomFiltersProps {
  locations: RoomLocation[];
  rooms: RoomOption[];
  locationId: number | '';
  roomId: number | '';
  date: Dayjs | null;
  onLocationChange: (locationId: number) => void;
  onRoomChange: (roomId: number) => void;
  onDateChange: (date: Dayjs | null) => void;
  onClear: () => void;
}

export default function RoomFilters({
  locations,
  rooms,
  locationId,
  roomId,
  date,
  onLocationChange,
  onRoomChange,
  onDateChange,
  onClear
}: Readonly<RoomFiltersProps>) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: { md: 'center' } }}
        >
        <TextField
            select
            size="small"
            label="Sucursal"
            value={locationId}
            onChange={(event) => onLocationChange(Number(event.target.value))}
            sx={{ minWidth: 240 }}
        >
            {locations.map((location) => (
            <MenuItem key={location.id} value={location.id}>
                {location.name}
            </MenuItem>
            ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Sala"
          value={roomId}
          onChange={(event) => onRoomChange(Number(event.target.value))}
          sx={{ minWidth: 200 }}
        >
          {rooms.map((room) => (
            <MenuItem key={room.id} value={room.id}>
              {room.name}
            </MenuItem>
          ))}
        </TextField>

        <DatePicker
          label="Fecha"
          value={date ?? dayjs()}
          onChange={onDateChange}
          slotProps={{ textField: { size: 'small' } }}
        />

        <Button variant="outlined" onClick={onClear} sx={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}>
          Limpiar filtros
        </Button>
      </Stack>
    </Paper>
  );
}