import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { FEE_TYPE_LABELS, formatFeeAmount, getFeeName, type Fee } from '../types/fees';

interface FeeDetailDialogProps {
  readonly fee: Fee | null;
  readonly onClose: () => void;
}

interface DetailFieldProps {
  readonly label: string;
  readonly value: string;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div>
      <Typography sx={{ color: 'primary.dark' }}>{label}</Typography>
      <Typography>{value}</Typography>
    </div>
  );
}

export default function FeeDetailDialog({ fee, onClose }: FeeDetailDialogProps) {
  const [displayedFee, setDisplayedFee] = useState<Fee | null>(fee);
  if (fee && fee !== displayedFee) {
    setDisplayedFee(fee);
  }
  return (
    <Dialog
      open={fee !== null}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 2 } } }}
    >
      {displayedFee && (
        <>
          <DialogTitle sx={{ color: 'primary.dark', fontWeight: 700, pr: 6 }}>
            {getFeeName(displayedFee)}
            <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <DetailField label="Tipo" value={FEE_TYPE_LABELS[displayedFee.TYPE]} />
              <DetailField label="Formato audiovisual" value={displayedFee.AUDIOVISUAL_FORMAT_NAME} />
              <DetailField label="Monto" value={formatFeeAmount(displayedFee.AMOUNT)} />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} fullWidth sx={{ border: '1px solid', borderColor: 'primary.main' }}>
              Cerrar
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
