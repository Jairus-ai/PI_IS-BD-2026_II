import { useState, type ReactNode } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import useNotifications from '../../../hooks/useNotifications';
import OccupancyDonut from '../components/OccupancyDonut';
import RoomFilters from '../components/RoomFilters';
import RoomKpiRow from '../components/RoomKpiRow';
import RoomStatusCard from '../components/RoomStatusCard';
import ScreeningTimeline from '../components/ScreeningTimeline';
import { useRoomDashboardFilters } from '../hooks/useRoomDashboardFilters';
import { useClearRoomStatus, useRoomDashboard, useSetRoomStatus } from '../hooks/useRoomDashboard';
import type { RoomStatus } from '../types/roomDashboard';
import PageContainer from '../../../components/common/PageContainer';

const ACCESS_DENIED_MESSAGE = 'No tienes privilegios suficientes para ver el dashboard de salas.';
const LOAD_FILTERS_ERROR_MESSAGE = 'No se pudieron cargar las sucursales y salas.';
const LOAD_DASHBOARD_ERROR_MESSAGE = 'No se pudo cargar el dashboard de la sala.';
const NO_ROOMS_MESSAGE = 'No tienes salas asignadas para mostrar.';
const STATUS_UPDATED_MESSAGE = 'Estado de la sala actualizado';
const STATUS_ERROR_MESSAGE = 'No se pudo cambiar el estado de la sala. Intenta de nuevo.';
const AUTOMATIC_STATUS_MESSAGE = 'La sala volvió al estado automático';

const FORBIDDEN_STATUS = 403;

function isForbidden(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === FORBIDDEN_STATUS;
}

function DashboardFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PageContainer title="Dashboard de salas">
      <Stack spacing={3}>{children}</Stack>
    </PageContainer>
  );
}

export default function RoomDashboard() {
  const filters = useRoomDashboardFilters();
  const dateParam = filters.date?.isValid() ? filters.date.format('YYYY-MM-DD') : null;
  const { dashboard, isLoadingDashboard, isFetchingDashboard, dashboardError, refetchDashboard } =
    useRoomDashboard(filters.roomId, dateParam);
  const { setRoomStatus, isSettingStatus } = useSetRoomStatus();
  const { clearRoomStatus, isClearingStatus } = useClearRoomStatus();
  const notifications = useNotifications();
  //null means "the current screening", chosen by the server
  const [selectedScreeningId, setSelectedScreeningId] = useState<number | null>(null);

  const screenings = dashboard?.screenings ?? [];
  const currentScreening = screenings.find((screening) => screening.id === dashboard?.defaultScreeningId) ?? null;
  const selectedScreening = screenings.find((screening) => screening.id === selectedScreeningId) ?? currentScreening;

  const handleChangeStatus = async (status: RoomStatus) => {
    if (filters.roomId === '') {
      return;
    }
    try {
      await setRoomStatus({ roomId: filters.roomId, status });
      notifications.show(STATUS_UPDATED_MESSAGE, { severity: 'success', autoHideDuration: 3000 });
    } catch {
      notifications.show(STATUS_ERROR_MESSAGE, { severity: 'error', autoHideDuration: 5000 });
    }
  };

  const handleClearManualStatus = async () => {
    if (filters.roomId === '') {
      return;
    }
    try {
      await clearRoomStatus(filters.roomId);
      notifications.show(AUTOMATIC_STATUS_MESSAGE, { severity: 'success', autoHideDuration: 3000 });
    } catch {
      notifications.show(STATUS_ERROR_MESSAGE, { severity: 'error', autoHideDuration: 5000 });
    }
  };

  const handleClearFilters = () => {
    filters.clearFilters();
    setSelectedScreeningId(null);
  };

  if (isForbidden(filters.filtersError) || isForbidden(dashboardError)) {
    return (
      <DashboardFrame>
        <Alert severity="error">{ACCESS_DENIED_MESSAGE}</Alert>
      </DashboardFrame>
    );
  }

  if (filters.isLoadingFilters) {
    return (
      <DashboardFrame>
        <LinearProgress />
      </DashboardFrame>
    );
  }

  if (filters.filtersError) {
    return (
      <DashboardFrame>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void filters.refetchFilters()}>
              Reintentar
            </Button>
          }
        >
          {LOAD_FILTERS_ERROR_MESSAGE}
        </Alert>
      </DashboardFrame>
    );
  }

  if (filters.locations.length === 0) {
    return (
      <DashboardFrame>
        <Alert severity="info">{NO_ROOMS_MESSAGE}</Alert>
      </DashboardFrame>
    );
  }

  const dateLabel = dashboard?.isToday ? 'Hoy' : dayjs(dashboard?.date).locale('es').format('D [de] MMMM [de] YYYY');

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <DashboardFrame>

        <RoomFilters
          locations={filters.locations}
          rooms={filters.rooms}
          locationId={filters.locationId}
          roomId={filters.roomId}
          date={filters.date}
          onLocationChange={filters.selectLocation}
          onRoomChange={filters.selectRoom}
          onDateChange={filters.selectDate}
          onClear={handleClearFilters}
        />

        {(isLoadingDashboard || isFetchingDashboard) && <LinearProgress />}

        {dashboardError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void refetchDashboard()}>
                Reintentar
              </Button>
            }
          >
            {LOAD_DASHBOARD_ERROR_MESSAGE}
          </Alert>
        )}

        {dashboard && (
          <>
            <RoomStatusCard
              dashboard={dashboard}
              currentScreening={currentScreening}
              isUpdating={isSettingStatus || isClearingStatus}
              isRefreshing={isFetchingDashboard}
              onChangeStatus={(status) => void handleChangeStatus(status)}
              onClearManualStatus={() => void handleClearManualStatus()}
              onRefresh={() => void refetchDashboard()}
            />

            <RoomKpiRow
              capacity={dashboard.room.capacity}
              screening={selectedScreening}
              daySummary={dashboard.daySummary}
            />

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 5fr) minmax(0, 7fr)' }
              }}
            >
              <OccupancyDonut
                sold={selectedScreening?.ticketsSold ?? 0}
                available={selectedScreening?.ticketsAvailable ?? dashboard.room.capacity}
                percent={selectedScreening?.occupancyPercent ?? 0}
                subtitle={
                  selectedScreening
                    ? `Distribución de asientos · ${selectedScreening.movieTitle} ${selectedScreening.startTime}`
                    : 'Sin función seleccionada'
                }
              />
              <ScreeningTimeline
                screenings={screenings}
                selectedId={selectedScreening?.id ?? null}
                defaultId={currentScreening?.id ?? null}
                subtitle={`Funciones programadas para ${dashboard.room.name} · ${dateLabel}`}
                onSelect={setSelectedScreeningId}
                onResetToCurrent={() => setSelectedScreeningId(null)}
              />
            </Box>
          </>
        )}
      </DashboardFrame>
    </LocalizationProvider>
  );
}