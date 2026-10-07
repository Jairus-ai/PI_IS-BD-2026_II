import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useMovieForm } from '../hooks/useMovieForm';
import MovieFormFields from './MovieFormFields';

export default function MovieFormDialog({ movieId, open, onClose, onSaved }: {
  movieId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const form = useMovieForm({ movieId, open, onClose, onSaved });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ color: 'primary.dark', fontWeight: 700 }}>
        {form.isCreate ? 'Crear película' : 'Editar película'}
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        {form.loading || (!form.isCreate && !form.detail) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <MovieFormFields form={form} formId="movie-form" />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="movie-form" variant="contained" disabled={form.saving}>
          {form.isCreate ? 'Crear' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
