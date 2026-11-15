import type { Location } from '../types/locations';
import type { LocationFormValues } from './locationFormValidation';
import {parseTime} from './locationFormUtils';


export function mapDetailToFormValues(detail: Location): LocationFormValues {
    return {
        name: detail.LOCATION_NAME ?? '',
        opening_hour: parseTime(detail.OPENING_HOUR),
        closing_hour: parseTime(detail.CLOSING_HOUR),
        canton_name: detail.CANTON_NAME ?? '',
        province_id: detail.ID_PROVINCE ?? null, 
    };
}