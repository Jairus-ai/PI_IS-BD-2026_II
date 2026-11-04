import { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { Breakpoint } from '@mui/material';

export interface CrudDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
  readonly loading?: boolean;
  readonly maxWidth?: Breakpoint;
}

export function CrudDialog({
  open,
  title,
  onClose,
  children,
  actions,
  loading = false,
  maxWidth = 'sm',
}: CrudDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle sx={{
        color: 'primary.dark',
        fontWeight: 700,
        padingRight: '48px'
      }}>
        {title}
        <IconButton
          aria-label="Cerrar"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        {loading ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            padding: '32px'
          }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          children
        )}
      </DialogContent>

      {actions ?
        <DialogActions>
          {actions}
        </DialogActions>
        :
        null
      }
    </Dialog>
  );
}