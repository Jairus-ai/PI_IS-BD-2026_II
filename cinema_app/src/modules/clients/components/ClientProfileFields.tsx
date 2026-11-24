import type { ChangeEvent, FocusEvent } from 'react';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { esES } from '@mui/x-date-pickers/locales';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';

export type ProfileValues = {
  firstName: string;
  middleName: string;
  firstSurname: string;
  lastSurname: string;
  identificationType: string;
  identificationNumber: string;
  birthdate: string;
  phoneNumber: string;
};

export type FieldErrors = Partial<Record<string, string>>;

const IDENTIFICATION_TYPES = [
  { value: 'C', label: 'Cédula' },
  { value: 'P', label: 'Pasaporte' },
  { value: 'D', label: 'DIMEX' }
];

const BIRTHDATE_FORMAT = 'DD/MM/YYYY';
const DATE_PICKER_TEXT = esES.components.MuiLocalizationProvider.defaultProps.localeText;
const API_DATE_FORMAT = 'YYYY-MM-DD';

type FormFieldProps = Omit<TextFieldProps, 'name' | 'onChange'> & {
  label: string;
  name: string;
  values: Record<string, string>;
  errors: FieldErrors;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function FormField({ label, name, values, errors, onChange, ...textFieldProps }: FormFieldProps) {
  return (
    <FormControl fullWidth>
      <FormLabel htmlFor={name} required={textFieldProps.required}>{label}</FormLabel>
      <TextField
        id={name}
        name={name}
        value={values[name]}
        onChange={onChange}
        error={Boolean(errors[name])}
        helperText={errors[name]}
        fullWidth
        {...textFieldProps}
      />
    </FormControl>
  );
}

type ClientProfileFieldsProps = {
  values: ProfileValues;
  errors: FieldErrors;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onBirthdateChange: (birthdate: string) => void;
  onBirthdateBlur: () => void;
};

export default function ClientProfileFields({
  values,
  errors,
  onChange,
  onBlur,
  onBirthdateChange,
  onBirthdateBlur
}: Readonly<ClientProfileFieldsProps>) {
  const fieldProps = { values, errors, onChange, onBlur };

  const handleBirthdateChange = (birthdate: Dayjs | null) => {
    onBirthdateChange(birthdate?.isValid() ? birthdate.format(API_DATE_FORMAT) : '');
  };

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormField label="Nombre" name="firstName" autoComplete="given-name" required {...fieldProps} />
        <FormField label="Segundo nombre (opcional)" name="middleName" {...fieldProps} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormField label="Primer apellido" name="firstSurname" autoComplete="family-name" required {...fieldProps} />
        <FormField label="Segundo apellido (opcional)" name="lastSurname" {...fieldProps} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormField label="Tipo de identificación" name="identificationType" select required {...fieldProps}>
          {IDENTIFICATION_TYPES.map((type) => (
            <MenuItem key={type.value} value={type.value}>
              {type.label}
            </MenuItem>
          ))}
        </FormField>
        <FormField label="Número de identificación" name="identificationNumber" required {...fieldProps} />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl fullWidth>
          <FormLabel htmlFor="birthdate" required>Fecha de nacimiento</FormLabel>
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es" localeText={DATE_PICKER_TEXT}>
            <DatePicker
              value={values.birthdate ? dayjs(values.birthdate) : null}
              onChange={handleBirthdateChange}
              format={BIRTHDATE_FORMAT}
              openTo="year"
              views={['year', 'month', 'day']}
              disableFuture
              slotProps={{
                textField: {
                  id: 'birthdate',
                  fullWidth: true,
                  required: true,
                  onBlur: onBirthdateBlur,
                  error: Boolean(errors.birthdate),
                  helperText: errors.birthdate
                }
              }}
            />
          </LocalizationProvider>
        </FormControl>
        <FormField
          label="Celular"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          placeholder="8888-8888"
          required
          {...fieldProps}
        />
      </Stack>
    </>
  );
}