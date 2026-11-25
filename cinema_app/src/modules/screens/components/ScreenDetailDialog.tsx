import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import { DetailField } from '../../../components/crud/DetailField';
import { SCREEN_TYPE_LABELS, formatMinutes, getScreenTitle, type Screen } from '../types/screens';

interface ScreenDetailDialogProps {
  readonly screen: Screen | null;
  readonly onClose: () => void;
}

export default function ScreenDetailDialog({ screen, onClose }: ScreenDetailDialogProps) {
  const [displayedScreen, setDisplayedScreen] = useState<Screen | null>(screen);
  if (screen && screen !== displayedScreen) {
    setDisplayedScreen(screen);
  }

  return (
    <CrudDialog
      open={screen !== null}
      title={displayedScreen ? getScreenTitle(displayedScreen) : 'Sala'}
      onClose={onClose}
      maxWidth="sm"
      actions={<Button onClick={onClose}>Cerrar</Button>}
    >
      {displayedScreen && (
        <Stack spacing={1.5}>
          <DetailField label="Sala" value={displayedScreen.SCREEN_NAME} />
          <DetailField label="Sucursal" value={displayedScreen.LOCATION_NAME} />
          <DetailField label="Tipo de sala" value={SCREEN_TYPE_LABELS[displayedScreen.SCREEN_TYPE]} />
          <DetailField label="Cantidad de filas" value={displayedScreen.AMOUNT_ROWS} />
          <DetailField label="Asientos por fila" value={displayedScreen.AMOUNT_SEATS_PER_ROWS} />
          <DetailField label="Capacidad" value={displayedScreen.AMOUNT_SEATS} />
          <DetailField label="Tiempo de mantenimiento" value={formatMinutes(displayedScreen.MAINTENANCE_TIME)} />
          <DetailField label="Tiempo de anuncios" value={formatMinutes(displayedScreen.ADDS_TIME)} />
        </Stack>
      )}
    </CrudDialog>
  );
}
