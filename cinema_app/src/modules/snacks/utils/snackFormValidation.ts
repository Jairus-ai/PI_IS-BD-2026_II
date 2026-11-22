import type { ServerErrors } from './snackFormUtils';

export interface SnackFormValues {
  name: string;
  description: string;
  price: number|null;
}

export function validateAll(
  values: SnackFormValues,
): ServerErrors {
  const errors: ServerErrors = {};
  if (!values.name.trim()) errors.SNACK_NAME = 'Campo obligatorio';
  if (values.name.trim().length > 50) errors.SNACK_NAME = 'El nombre no puede exceder 50 caracteres.';

  if (values.price == null) 
  {
    errors.PRICE = 'Campo obligatorio';
  }
  else if (values.price<=0)
  {
    errors.PIRCE = 'El precio no pude ser 0';
  }

  if(!values.description.trim()) errors.SNACK_DESCRIPTION = 'Campo obligatorio';
  if (values.description.trim().length > 100) errors.SNACK_DESCRIPTION = 'La descripción no puede exceder 100 caracteres.';

  return errors;
}
