import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import { DetailField } from '../../../components/crud/DetailField';
import { useScreening } from '../hooks/useScreenings';
import { formatScreeningDate } from '../types/screenings';
import { formatDuration } from '../../movies/types/movies';

const DEFAULT_TITLE = 'Proyección';
const LOAD_ERROR_MESSAGE = 'No se pudo cargar el detalle de la proyección.';

interface ScreeningDetailDialogProps {
  readonly screeningId: number | null;
  readonly onClose: () => void;
}

export default function ScreeningDetailDialog({
  screeningId,
  onClose
}: ScreeningDetailDialogProps) {
  const [displayedId, setDisplayedId] = useState<number | null>(screeningId);

  if (screeningId !== null && screeningId !== displayedId)
    setDisplayedId(screeningId);

  const {
    screening,
    isLoadingScreening,
    screeningError,
    refetchScreening
  } = useScreening(displayedId);

  return (
    <CrudDialog
      open={screeningId !== null}
      title={screening?.MOVIE_TITLE ?? DEFAULT_TITLE}
      onClose={onClose}
      loading={isLoadingScreening}
      actions={<Button onClick={onClose}>Cerrar</Button>}
    >
      {screeningError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void refetchScreening()}
            >
              Reintentar
            </Button>
          }
        >
          {LOAD_ERROR_MESSAGE}
        </Alert>
      )}

      {screening && (
        <Stack spacing={1.5}>
          <DetailField
            label="Sucursal"
            value={screening.LOCATION_NAME}
          />
          <DetailField
            label="Sala"
            value={screening.SCREEN_NUMBER}
          />
          <DetailField
            label="Película"
            value={screening.MOVIE_TITLE}
          />
          <DetailField
            label="Clasificación"
            value={`${screening.RATING_CODE} - ${screening.RATING_NAME}`}
          />
          <DetailField
            label="Idioma"
            value={screening.LANGUAGE}
          />
          <DetailField
            label="Formato audiovisual"
            value={screening.AUDIOVISUAL_FORMAT}
          />
          <DetailField
            label="Fecha"
            value={formatScreeningDate(screening.SCREENING_DATE)}
          />
          <DetailField
            label="Hora de inicio"
            value={screening.START_TIME}
          />
          <DetailField
            label="Duración con mantenimiento y anuncios (hh:mm)"
            value={formatDuration(screening.DURATION)}
          />
          <DetailField
            label="Entradas vendidas"
            value={
              screening.HAS_SOLD_TICKETS === 1
                ? 'Sí'
                : 'No'
            }
          />
        </Stack>
      )}
    </CrudDialog>
  );
}
