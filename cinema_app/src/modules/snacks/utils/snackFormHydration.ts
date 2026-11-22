import type { Location } from '../types/snacks';
import type { LocationFormValues } from './snackFormValidation';
import {parseTime} from './snackFormUtils';


export function mapDetailToFormValues(detail: Location): LocationFormValues {
    return {
        name: detail.LOCATION_NAME ?? '',
        opening_hour: parseTime(detail.OPENING_HOUR),
        closing_hour: parseTime(detail.CLOSING_HOUR),
        canton_name: detail.CANTON_NAME ?? '',
        province_id: detail.ID_PROVINCE ?? null,
        province_name:detail.PROVINCE_NAME??'', 
    };
}