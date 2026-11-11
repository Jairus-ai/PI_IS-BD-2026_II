import type { LocationFormValues } from './locationFormValidation';

export function buildLocationPayload(values: LocationFormValues) {
    const { opening_hour, closing_hour } = values;

    return {
      LOCATION_NAME: values.name.trim(),
      OPENING_HOUR: opening_hour?.isValid() ? opening_hour.format('HH:mm') : null,
      CLOSING_HOUR: closing_hour?.isValid() ? closing_hour.format('HH:mm') : null,
      CANTON_NAME: values.canton_name.trim(),
    };
}