import Typography from '@mui/material/Typography';

export default function RequiredFieldsHint() {
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      Los campos marcados con * son obligatorios
    </Typography>
  );
}
