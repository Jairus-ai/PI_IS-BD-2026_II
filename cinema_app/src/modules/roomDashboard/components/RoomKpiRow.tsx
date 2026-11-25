import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { DaySummary, RoomScreening } from '../types/roomDashboard';
import { formatColones, formatPercent } from '../utils/roomDashboardFormat';

const EMPTY_VALUE = '—';

function KpiCard({ title, value, hint }: Readonly<{ title: string; value: string; hint: string }>) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Typography variant="overline" sx={{
        color: "text.secondary"
      }}>
        {title}
      </Typography>
      <Typography variant="h5" component="p" sx={{
        fontWeight: 600
      }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {hint}
      </Typography>
    </Paper>
  );
}

interface RoomKpiRowProps {
  capacity: number;
  screening: RoomScreening | null;
  daySummary: DaySummary;
}

export default function RoomKpiRow({ capacity, screening, daySummary }: Readonly<RoomKpiRowProps>) {
  const noScreeningHint = 'Sin función seleccionada';

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
      }}
    >
      <KpiCard
        title="Entradas vendidas"
        value={screening ? `${screening.ticketsSold} / ${capacity}` : EMPTY_VALUE}
        hint={screening ? `${screening.ticketsAvailable} disponibles` : noScreeningHint}
      />
      <KpiCard
        title="Ocupación"
        value={screening ? formatPercent(screening.occupancyPercent) : EMPTY_VALUE}
        hint="De la capacidad total"
      />
      <KpiCard
        title="Ingresos de la función"
        value={screening ? formatColones(screening.revenue) : EMPTY_VALUE}
        hint={screening ? `${screening.movieTitle} · ${screening.startTime}` : noScreeningHint}
      />
      <KpiCard
        title="Ingresos del día en sala"
        value={formatColones(daySummary.revenue)}
        hint={`Ticket promedio ${formatColones(daySummary.averageTicket)}`}
      />
    </Box>
  );
}