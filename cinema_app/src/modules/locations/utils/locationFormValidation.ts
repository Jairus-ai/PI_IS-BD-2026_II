import type { Dayjs } from 'dayjs';
import type { ServerErrors } from './locationFormUtils';

export interface LocationFormValues {
  name: string;
  opening_hour: Dayjs | null;
  closing_hour: Dayjs | null;
  province_id: number | null;
  canton_name: string;
}

export function validateAll(
  values: LocationFormValues,
): ServerErrors {
  const errors: ServerErrors = {};
  if (!values.name.trim()) errors.LOCATION_NAME = 'Campo obligatorio';
  if (values.name.trim().length > 30) errors.LOCATION_NAME = 'El nombre no puede exceder 30 caracteres.';

  if (!values.opening_hour?.isValid()) {
    errors.OPENING_HOUR = 'Seleccione la hora de apertura.';
  }

  if (!values.closing_hour?.isValid()) {
    errors.CLOSING_HOUR = 'Seleccione la hora de cierre.';
  } 

  if (!values.canton_name.trim()) errors.CANTON_NAME = 'Campo obligatorio';

  if (values.province_id == null) errors.PROVINCE_NAME = 'Seleccione una provincia.';

  return errors;
}
