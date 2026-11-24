import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  MANUAL_STATUS_OPTIONS,
  ROOM_STATUS_COLORS,
  ROOM_STATUS_LABELS,
  type RoomDashboard,
  type RoomScreening,
  type RoomStatus,
  type ScreeningPhase
} from '../types/roomDashboard';
import { buildTimingHint, formatDuration, formatSeats } from '../utils/roomDashboardFormat';
import { getPosterSrc } from '../utils/posterSrc';

const FUNCTION_LABELS: Record<ScreeningPhase, string> = {
  IN_PROGRESS: 'Función actual',
  UPCOMING: 'Próxima función',
  FINISHED: 'Última función'
};

function SectionLabel({ children }: Readonly<{ children: string }>) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: "text.secondary",
        lineHeight: 1.5
      }}>
      {children}
    </Typography>
  );
}

function PosterThumb({ src, title }: Readonly<{ src: string | null; title: string }>) {
  const [failed, setFailed] = useState(false);

  return (
    <Box
      sx={{
        width: 88,
        height: 120,
        flexShrink: 0,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'action.hover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={`Póster de ${title}`}
          onError={() => setFailed(true)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <MovieOutlinedIcon color="disabled" fontSize="large" />
      )}
    </Box>
  );
}

interface ManualStatusControlProps {
  current: RoomStatus | null;
  isManual: boolean;
  disabled: boolean;
  onChange: (status: RoomStatus) => void;
  onClear: () => void;
}

function ManualStatusControl({ current, isManual, disabled, onChange, onClear }: Readonly<ManualStatusControlProps>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Button size="small" variant="outlined" disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)}>
        Cambiar estado
      </Button>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={close}>
        {MANUAL_STATUS_OPTIONS.map((status) => (
          <MenuItem
            key={status}
            selected={status === current}
            onClick={() => {
              close();
              onChange(status);
            }}
          >
            {ROOM_STATUS_LABELS[status]}
          </MenuItem>
        ))}
        {isManual && <Divider />}
        {isManual && (
          <MenuItem
            onClick={() => {
              close();
              onClear();
            }}
          >
            Volver a automático
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

interface RoomStatusCardProps {
  dashboard: RoomDashboard;
  currentScreening: RoomScreening | null;
  isUpdating: boolean;
  isRefreshing: boolean;
  onChangeStatus: (status: RoomStatus) => void;
  onClearManualStatus: () => void;
  onRefresh: () => void;
}

export default function RoomStatusCard({
  dashboard,
  currentScreening,
  isUpdating,
  isRefreshing,
  onChangeStatus,
  onClearManualStatus,
  onRefresh
}: Readonly<RoomStatusCardProps>) {
  const { room, operationalStatus, manualStatus } = dashboard;
  const isManual = dashboard.statusSource === 'MANUAL';
  const timingHint = currentScreening ? buildTimingHint(dashboard.timing, currentScreening.phase) : null;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{
        alignItems: { md: 'center' }
      }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: "center",
            flex: 1
          }}>
          <PosterThumb
            key={currentScreening?.poster ?? 'no-poster'}
            src={getPosterSrc(currentScreening?.poster ?? null)}
            title={currentScreening?.movieTitle ?? room.name}
          />
          <Stack spacing={0.5} sx={{
            alignItems: "flex-start"
          }}>
            <SectionLabel>Estado operativo actual</SectionLabel>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                flexWrap: "wrap"
              }}>
              {operationalStatus ? (
                <Chip size="small" color={ROOM_STATUS_COLORS[operationalStatus]} label={ROOM_STATUS_LABELS[operationalStatus]} />
              ) : (
                <Chip size="small" variant="outlined" label="Sin estado en tiempo real" />
              )}
              {isManual && manualStatus && (
                <Typography variant="caption" sx={{
                  color: "text.secondary"
                }}>
                  Manual hasta las {manualStatus.expiresAt}
                </Typography>
              )}
            </Stack>
            <Typography variant="h5" component="h2" sx={{
              fontWeight: 600
            }}>
              {room.name}
            </Typography>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              Capacidad total: {formatSeats(room.capacity)}
            </Typography>
            {dashboard.isToday && (
              <ManualStatusControl
                current={operationalStatus}
                isManual={isManual}
                disabled={isUpdating}
                onChange={onChangeStatus}
                onClear={onClearManualStatus}
              />
            )}
          </Stack>
        </Stack>

        <Stack spacing={0.5} sx={{ flex: 1 }}>
          <SectionLabel>{currentScreening ? FUNCTION_LABELS[currentScreening.phase] : 'Función actual'}</SectionLabel>
          {currentScreening ? (
            <>
              <Typography variant="h6" component="p" sx={{
                fontWeight: 600
              }}>
                {currentScreening.movieTitle}
              </Typography>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                {[currentScreening.genres, formatDuration(currentScreening.durationMinutes)].filter(Boolean).join(' · ')}
              </Typography>
              <Stack direction="row" spacing={3}>
                <Typography variant="body2">
                  Inicio <Box component="span" sx={{ fontWeight: 600 }}>{currentScreening.startTime}</Box>
                </Typography>
                <Typography variant="body2">
                  Final estimado <Box component="span" sx={{ fontWeight: 600 }}>{currentScreening.endTime}</Box>
                </Typography>
              </Stack>
              {timingHint && (
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {timingHint}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              No hay funciones programadas para esta fecha.
            </Typography>
          )}
        </Stack>

        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 2, py: 1.5, minWidth: 160 }}>
          <SectionLabel>Última actualización</SectionLabel>
          <Typography variant="h6" component="p" sx={{ fontWeight: 600 }}>
            {dashboard.lastUpdated}
          </Typography>
          <Button size="small" startIcon={<RefreshIcon />} disabled={isRefreshing} onClick={onRefresh} sx={{ mt: 1 }}>
            Actualizar
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}