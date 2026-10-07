import * as React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormGroup from '@mui/material/FormGroup';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Dayjs } from 'dayjs';
import type { Discount, DiscountProduct } from '../types/discounts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useDiscountProducts } from '../hooks/useDiscounts';

export interface DiscountFormState {
  values: Partial<Omit<Discount, 'id'>>;
  errors: Partial<Record<keyof DiscountFormState['values'], string>>;
}

//modificar ahorita
export type FormFieldValue = string | string[] | number | boolean | File | null;

export interface DiscountFormProps {
  readonly formState: DiscountFormState;
  readonly onFieldChange: (name: keyof DiscountFormState['values'], value: FormFieldValue) => void;
  readonly onSubmit: (formValues: Partial<DiscountFormState['values']>) => Promise<void>;
  readonly onCancel?: () => void;
  readonly submitButtonLabel: string;
}

export default function MovieForm(props:DiscountFormProps) {
  const {
    formState,
    onFieldChange,
    onSubmit,
    submitButtonLabel,
  } = props;

  const formValues = formState.values;
  const formErrors = formState.errors;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { products: rawProducts} = useDiscountProducts();
  const products = rawProducts as DiscountProduct[];

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

  const handleDateFieldChange = React.useCallback(
  (fieldName: keyof DiscountFormState['values']) => (value: Dayjs | null) => {
    if (value?.isValid()) {
      onFieldChange(fieldName, value.format('YYYY-MM-DD'));
    } else if (formValues[fieldName]) {
      onFieldChange(fieldName, null);
    }
  },
  [formValues, onFieldChange],
);

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
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', flexDirection: 'column'}}>
            <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Nombre</Typography>
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
           <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', flexDirection: 'column'}}>
            <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Porcentaje</Typography>
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
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', flexDirection: 'column'}}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Fecha de inicio</Typography>
              <DatePicker
                value={formValues.DISCOUNT_START_DATE ? dayjs(formValues.DISCOUNT_START_DATE) : null}
                onChange={handleDateFieldChange('DISCOUNT_START_DATE')}
                name="fecha de inicio del descuento"
                label="fecha de inicio del descuento"
                slotProps={{
                  textField: {
                    error: !!formErrors.DISCOUNT_START_DATE,
                    helperText: formErrors.DISCOUNT_START_DATE ?? ' ',
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
         <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', flexDirection: 'column'}}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Fecha de finalización</Typography>
              <DatePicker
                value={formValues.DISCOUNT_FINISH_DATE ? dayjs(formValues.DISCOUNT_FINISH_DATE) : null}
                onChange={handleDateFieldChange('DISCOUNT_FINISH_DATE')}
                name="fecha de finalización del descuento"
                label="fecha de finalización del descuento"
                slotProps={{
                  textField: {
                    error: !!formErrors.DISCOUNT_FINISH_DATE,
                    helperText: formErrors.DISCOUNT_FINISH_DATE ?? ' ',
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', flexDirection: 'column',  marginLeft: '25%'}}>
            <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Producto del descuento</Typography>
            <Autocomplete
              options={products}
              getOptionLabel={(p) => p.SNACK_NAME}
              isOptionEqualToValue={(a, b) => a.ID_SNACK === b.ID_SNACK}
              value={products.find((p) => p.ID_SNACK === formValues.ID_FK_PRODUCT) ?? null}
              onChange={(_, selected) => onFieldChange('ID_FK_PRODUCT', selected?.ID_SNACK ?? null)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Producto"
                  error={!!formErrors.ID_FK_PRODUCT}
                  helperText={formErrors.ID_FK_PRODUCT ?? ' '}
                />
              )}
            />
          </Grid>
        </Grid>
      </FormGroup>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Button
          variant="contained" onClick={props.onCancel} disabled={isSubmitting}>
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
