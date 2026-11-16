import type { LocationFormValues } from './locationFormValidation';

export function buildLocationPayload(values: LocationFormValues) {
    const { opening_hour, closing_hour } = values;
    const canton = typeof values.canton_name === 'string' ? values.canton_name.trim() : '';
    const province = typeof values.province_name === 'string' ? values.province_name.trim() : '';
    const locationName = typeof values.name === 'string' ? values.name.trim() : '';

    return {
        LOCATION_NAME: locationName,
        OPENING_HOUR: opening_hour?.isValid() ? opening_hour.format('HH:mm') : null,
        CLOSING_HOUR: closing_hour?.isValid() ? closing_hour.format('HH:mm') : null,
        ID_PROVINCE: values.province_id,
        PROVINCE_NAME: province === '' ? null : province,
        CANTON_NAME: canton === '' ? null : canton,
        CANTON_ID: values.canton_id,
    };
}