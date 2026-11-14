import type { LocationFormValues } from './locationFormValidation';

export function buildLocationPayload(values: LocationFormValues) {
    const { opening_hour, closing_hour } = values;
    const canton = values.canton_name.trim();

    return {
        LOCATION_NAME: values.name.trim(),
        OPENING_HOUR: opening_hour?.isValid() ? opening_hour.format('HH:mm') : null,
        CLOSING_HOUR: closing_hour?.isValid() ? closing_hour.format('HH:mm') : null,
        ID_PROVINCE: values.province_id,
        CANTON_NAME: canton === '' ? null : canton,
    };
}