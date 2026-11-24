import type { Snack } from '../types/snacks';
import type { SnackFormValues } from './snackFormValidation';


export function mapDetailToFormValues(detail: Snack): SnackFormValues {
    return {
        name: detail.SNACK_NAME ?? '',
        description: detail.SNACK_DESCRIPTION ?? '',
        price:detail.PRICE ?? null,
    };
}