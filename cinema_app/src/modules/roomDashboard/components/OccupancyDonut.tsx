import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { PieChart } from '@mui/x-charts/PieChart';
import { formatPercent, formatSeats } from '../utils/roomDashboardFormat';

const CHART_SIZE = 160;

interface OccupancyDonutProps {
  sold: number;
  available: number;
  percent: number;
  subtitle: string;
}

function LegendItem({ color, label, seats }: Readonly<{ color: string; label: string; seats: number }>) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
      <Box>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatSeats(seats)}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function OccupancyDonut({ sold, available, percent, subtitle }: Readonly<OccupancyDonutProps>) {
  const theme = useTheme();
  const soldColor = theme.palette.primary.main;
  const availableColor = theme.palette.grey[300];

  return (
    <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
        Ocupación de la sala
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {subtitle}
      </Typography>

      <Stack
        direction="row"
        spacing={4}
        sx={{ mt: 3, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}
      >
        <Box
          role="img"
          aria-label={`Ocupación ${formatPercent(percent)}`}
          sx={{ position: 'relative', width: CHART_SIZE, height: CHART_SIZE }}
        >
          <PieChart
            width={CHART_SIZE}
            height={CHART_SIZE}
            hideLegend
            series={[
              {
                innerRadius: '68%',
                outerRadius: '100%',
                data: [
                  { id: 'sold', value: sold, label: 'Vendidos', color: soldColor },
                  { id: 'available', value: available, label: 'Disponibles', color: availableColor }
                ]
              }
            ]}
          />
          {}
          <Stack
            sx={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
              {formatPercent(percent)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              ocupación
            </Typography>
          </Stack>
        </Box>

        <Stack spacing={2}>
          <LegendItem color={soldColor} label="Vendidos" seats={sold} />
          <LegendItem color={availableColor} label="Disponibles" seats={available} />
        </Stack>
      </Stack>
    </Paper>
  );
}