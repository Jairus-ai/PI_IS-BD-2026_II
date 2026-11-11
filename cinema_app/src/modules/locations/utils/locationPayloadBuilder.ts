import type { Dayjs } from 'dayjs';
import type { LocationFormValues } from './locationFormValidation';

export function buildLocationPayload(values: LocationFormValues) {
  const hourOP = values.opening_hour ? (values.opening_hour as Dayjs).hour() :0;
  const hourCL = values.closing_hour ? (values.closing_hour as Dayjs).hour() :0;
  
  return {
    LOCATION_NAME: values.name.trim(),
    OPENING_HOUR: hourOP,
    CLOSING_HOUR: hourCL,
    CANTON_NAME: values.canton_name.trim(),
  };
}