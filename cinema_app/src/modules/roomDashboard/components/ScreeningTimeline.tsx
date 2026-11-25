import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  SCREENING_PHASE_COLORS,
  SCREENING_PHASE_LABELS,
  type RoomScreening
} from '../types/roomDashboard';
import { formatDuration } from '../utils/roomDashboardFormat';

interface ScreeningTimelineProps {
  screenings: RoomScreening[];
  selectedId: number | null;
  defaultId: number | null;
  subtitle: string;
  onSelect: (screeningId: number) => void;
  onResetToCurrent: () => void;
}

function buildDetails(screening: RoomScreening): string {
  return [
    screening.genres,
    formatDuration(screening.durationMinutes),
    `${screening.ticketsSold} entradas vendidas`
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function ScreeningTimeline({
  screenings,
  selectedId,
  defaultId,
  subtitle,
  onSelect,
  onResetToCurrent
}: Readonly<ScreeningTimelineProps>) {
  const showReset = defaultId !== null && selectedId !== defaultId;

  return (
    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: "flex-start"
        }}>
        <Box>
          <Typography variant="subtitle1" component="h2" sx={{
            fontWeight: 600
          }}>
            Cronograma de funciones
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {subtitle}
          </Typography>
        </Box>
        {showReset && (
          <Button size="small" variant="outlined" onClick={onResetToCurrent} sx={{ whiteSpace: 'nowrap' }}>
            Volver a función actual
          </Button>
        )}
      </Stack>

      {screenings.length === 0 ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 3
          }}>
          No hay funciones programadas para esta sala en la fecha seleccionada.
        </Typography>
      ) : (
        <List disablePadding sx={{ mt: 2 }}>
          {screenings.map((screening) => (
            <ListItemButton
              key={screening.id}
              selected={screening.id === selectedId}
              onClick={() => onSelect(screening.id)}
              sx={{ borderRadius: 1, alignItems: 'flex-start', gap: 2 }}
            >
              <Box
                sx={{
                  mt: 0.75,
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: '50%',
                  bgcolor: `${SCREENING_PHASE_COLORS[screening.phase]}.main`
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{
                  fontWeight: 600
                }}>
                  {screening.startTime} – {screening.endTime}
                </Typography>
                <Typography variant="body2">{screening.movieTitle}</Typography>
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  {buildDetails(screening)}
                </Typography>
              </Box>
              <Chip
                size="small"
                color={SCREENING_PHASE_COLORS[screening.phase]}
                variant={screening.phase === 'FINISHED' ? 'outlined' : 'filled'}
                label={SCREENING_PHASE_LABELS[screening.phase]}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );
}