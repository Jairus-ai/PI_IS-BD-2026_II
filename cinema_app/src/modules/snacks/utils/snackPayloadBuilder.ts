import type { SnackFormValues } from './snackFormValidation';

export function buildSnackPayload(values: SnackFormValues) {

    return {
        SNACK_NAME: values.name.trim(),
        SNACK_DESCRIPTION: values.description.trim(),
        PRICE: values.price,
    };
}