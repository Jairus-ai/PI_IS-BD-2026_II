import type { LocationFormValues } from './snackFormValidation';

export function buildLocationPayload(values: LocationFormValues) {
    const { opening_hour, closing_hour } = values;
    const canton = values.canton_name?.trim() ?? '';
    const province = values.province_name?.trim() ?? '';

    return {
        LOCATION_NAME: values.name.trim(),
        OPENING_HOUR: opening_hour?.isValid() ? opening_hour.format('HH:mm') : null,
        CLOSING_HOUR: closing_hour?.isValid() ? closing_hour.format('HH:mm') : null,
        ID_PROVINCE: values.province_id,
        CANTON_NAME: canton === '' ? null : canton,
        PROVINCE_NAME: province === '' ? null : province,
    };
}