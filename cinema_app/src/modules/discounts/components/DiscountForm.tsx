import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
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
  submitButtonLabel: string;
}

export default function MovieForm(props:Readonly<DiscountFormProps>) {
const {
    formState,
    onFieldChange,
    onSubmit,
    submitButtonLabel,
  } = props;

  const formValues = formState.values;
  const formErrors = formState.errors;

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>) => {
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

  //for other histories
  /*const handleCheckboxFieldChange = React.useCallback(
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
  );*/

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
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              type="number"
              value={formValues.ID_DISCOUNT ?? ''}
              onChange={handleNumberFieldChange}
              name="ID_DISCOUNT"
              label="ID"
              error={!!formErrors.ID_DISCOUNT}
              helperText={formErrors.ID_DISCOUNT ?? ' '}
              fullWidth
            />
          </Grid>
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
