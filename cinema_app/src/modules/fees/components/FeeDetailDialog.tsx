import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import { DetailField } from '../../../components/crud/DetailField';
import { FEE_TYPE_LABELS, formatFeeAmount, getFeeName, type Fee } from '../types/fees';

interface FeeDetailDialogProps {
  readonly fee: Fee | null;
  readonly onClose: () => void;
}

export default function FeeDetailDialog({ fee, onClose }: FeeDetailDialogProps) {
  const [displayedFee, setDisplayedFee] = useState<Fee | null>(fee);
  if (fee && fee !== displayedFee) {
    setDisplayedFee(fee);
  }

  return (
    <CrudDialog
      open={fee !== null}
      title={displayedFee ? getFeeName(displayedFee) : 'Tarifa'}
      onClose={onClose}
      maxWidth="sm"
      actions={<Button onClick={onClose}>Cerrar</Button>}
    >
      {displayedFee && (
        <Stack spacing={1.5}>
          <DetailField label="Tipo" value={FEE_TYPE_LABELS[displayedFee.TYPE]} />
          <DetailField label="Formato audiovisual" value={displayedFee.AUDIOVISUAL_FORMAT_NAME} />
          <DetailField label="Monto" value={formatFeeAmount(displayedFee.AMOUNT)} />
        </Stack>
      )}
    </CrudDialog>
  );
}
