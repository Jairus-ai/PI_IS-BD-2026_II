import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent, SelectProps } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router';
import dayjs, { Dayjs } from 'dayjs';
import type { Discount } from '../types/discounts';

export interface DiscountFormState {
  values: Partial<Omit<Discount, 'id'>>;
  errors: Partial<Record<keyof DiscountFormState['values'], string>>;
}

//modificar ahorita
export type FormFieldValue = string | string[] | number | boolean | File | null;

export interface DiscountFormProps {
  formState: DiscountFormState;
  onFieldChange: (
    name: keyof DiscountFormState['values'],
    value: FormFieldValue,
  ) => void;
  onSubmit: (formValues: Partial<DiscountFormState['values']>) => Promise<void>;
  onReset?: (formValues: Partial<DiscountFormState['values']>) => void;
  submitButtonLabel: string;
  backButtonPath?: string;
}

export default function MovieForm(props: DiscountFormProps) {
const {
    formState,
    onFieldChange,
    onSubmit,
    onReset,
    submitButtonLabel,
    backButtonPath,
  } = props;

  const formValues = formState.values;
  const formErrors = formState.errors;

  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      try {
        await onSubmit(formValues);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, onSubmit],
  );

  const handleTextFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(
        event.target.name as keyof DiscountFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleNumberFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(
        event.target.name as keyof DiscountFormState['values'],
        Number(event.target.value),
      );
    },
    [onFieldChange],
  );

  const handleCheckboxFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      onFieldChange(event.target.name as keyof DiscountFormState['values'], checked);
    },
    [onFieldChange],
  );

  const handleDateFieldChange = React.useCallback(
    (fieldName: keyof DiscountFormState['values']) => (value: Dayjs | null) => {
      if (value?.isValid()) {
        onFieldChange(fieldName, value.toISOString() ?? null);
      } else if (formValues[fieldName]) {
        onFieldChange(fieldName, null);
      }
    },
    [formValues, onFieldChange],
  );

  const handleSelectFieldChange = React.useCallback(
    (event: SelectChangeEvent) => {
      onFieldChange(
        event.target.name as keyof DiscountFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleBack = React.useCallback(() => {
    navigate(backButtonPath ?? '/discounts');
  }, [navigate, backButtonPath]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      sx={{ width: '100%' }}
    >
      <FormGroup>
        <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.DISCOUNT_NAME ?? ''}
              onChange={handleTextFieldChange}
              name="DISCOUNT_NAME"
              label="Nombre del Descuento"
              error={!!formErrors.DISCOUNT_NAME}
              helperText={formErrors.DISCOUNT_NAME ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.DISCOUNT_START_DATE ?? ''}
              onChange={handleTextFieldChange}
              name="DISCOUNT_START_DATE"
              label="Fecha de inicio"
              error={!!formErrors.DISCOUNT_START_DATE}
              helperText={formErrors.DISCOUNT_START_DATE ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.DISCOUNT_FINISH_DATE ?? ''}
              onChange={handleTextFieldChange}
              name="DISCOUNT_FINISH_DATE"
              label="Fecha de finalización"
              error={!!formErrors.DISCOUNT_FINISH_DATE}
              helperText={formErrors.DISCOUNT_FINISH_DATE ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              type="number"
              value={formValues.DISCOUNT_PORCENTAGE ?? ''}
              onChange={handleNumberFieldChange}
              name="DISCOUNT_PORCENTAGE"
              label="Porcentaje del descuento"
              error={!!formErrors.DISCOUNT_PORCENTAGE}
              helperText={formErrors.DISCOUNT_PORCENTAGE ?? ' '}
              fullWidth
            />
          </Grid>
        </Grid>
      </FormGroup>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Volver
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={isSubmitting}
        >
          {submitButtonLabel}
        </Button>
      </Stack>
    </Box>
  );
}
