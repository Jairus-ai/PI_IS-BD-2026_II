import { useState, type ChangeEvent, type FocusEvent, type ReactNode } from 'react';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

type PasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  error?: string;
  autoComplete?: 'new-password' | 'current-password';
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  children?: ReactNode;
};

export default function PasswordField({
  label,
  name,
  value,
  error,
  autoComplete = 'new-password',
  onChange,
  onBlur,
  children
}: Readonly<PasswordFieldProps>) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FormControl fullWidth>
      <FormLabel htmlFor={name} required>{label}</FormLabel>
      <TextField
        id={name}
        name={name}
        type={isVisible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder="••••••••"
        required
        fullWidth
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        error={Boolean(error)}
        helperText={error}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setIsVisible((previous) => !previous)}
                  onMouseDown={(event) => event.preventDefault()}
                  edge="end"
                  size="small"
                >
                  {isVisible ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </InputAdornment>
            )
          }
        }}
      />
      {children}
    </FormControl>
  );
}
