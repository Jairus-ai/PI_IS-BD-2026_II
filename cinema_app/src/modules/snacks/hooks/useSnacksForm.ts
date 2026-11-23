import * as React from 'react';
import { useSnacks } from './useSnacks';
import useNotifications from '../../../hooks/useNotifications';
import { readServerErrors } from '../utils/snackFormUtils';
import type { ServerErrors } from '../utils/snackFormUtils';
import { validateAll } from '../utils/snackFormValidation';
import type { SnackFormValues } from '../utils/snackFormValidation';
import { mapDetailToFormValues } from '../utils/snackFormHydration';
import { buildSnackPayload } from '../utils/snackPayloadBuilder';
import { getErrorMessage } from '../../../services/errorMessage';


const initialFormValues: SnackFormValues = {
    name: '',
    price: null,
    description:'',
};

const ERROR_KEY: Record<keyof SnackFormValues, string> = {
    name: 'SNACK_NAME',
    price: 'PRICE',
    description: 'SNACK_DESCRIPTION',
};

const ALL_ERROR_KEYS = Object.values(ERROR_KEY);

export interface UseSnackFormArgs {
    snackId: number | null;
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export function useSnackForm({ snackId, open, onClose, onSaved }: UseSnackFormArgs) {
    const isCreate = snackId == null;

    const notifications = useNotifications();

    const [values, setValues] = React.useState<SnackFormValues>(initialFormValues);
    const [fieldErrors, setFieldErrors] = React.useState<ServerErrors>({});
    const [touched, setTouched] = React.useState<Record<string, boolean>>({});

    const {
        snackDetail,
        isLoadingDetail,
        createSnack,
        updateSnack,
        isCreatingSnack,
        isUpdatingSnack,
    } = useSnacks(1, open && !isCreate ? snackId : null);

    const touchedRef = React.useRef<Record<string, boolean>>({});

    const saving = isCreatingSnack || isUpdatingSnack;
    const loading = !isCreate && isLoadingDetail;

    const validateAndSet = (
        merged: SnackFormValues,
        touchedMap: Record<string, boolean>,
    ) => {
        const all = validateAll(merged);
        const next: ServerErrors = {};
        for (const key of Object.keys(all)) {
            if (touchedMap[key]) {
                next[key] = all[key];
            }
        }
        setFieldErrors(next);
    };

    const touchAndValidate = (errorKey: string, currentValues: SnackFormValues) => {
        const nextTouched = { ...touchedRef.current, [errorKey]: true };
        touchedRef.current = nextTouched;
        setTouched(nextTouched);
        validateAndSet(currentValues, nextTouched);
    };

    const handleBlur = (errorKey: string) => () => {
        touchAndValidate(errorKey, values);
    };

    const setFieldValue = <K extends keyof SnackFormValues>(
        field: K,
        value: SnackFormValues[K],
    ) => {
        const updated = { ...values, [field]: value };
        setValues(updated);
        touchAndValidate(ERROR_KEY[field], updated);
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue('name', event.target.value);
    };

    const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue('description', event.target.value);
    };

    const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        setFieldValue('price', raw === '' ? null : Number(raw));
    };
    React.useEffect(() => {
        if (!open) {
            return;
        }

        touchedRef.current = {};
        setTouched({});
        setFieldErrors({});

        setValues(
            !isCreate && snackDetail
                ? mapDetailToFormValues(snackDetail)
                : initialFormValues,
        );
    }, [open, isCreate, snackDetail]);

    const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();

        const allTouched = Object.fromEntries(ALL_ERROR_KEYS.map((key) => [key, true]));
        touchedRef.current = allTouched;
        setTouched(allTouched);

        const all = validateAll(values);
        setFieldErrors(all);
        if (Object.keys(all).length > 0) {
            return;
        }

        try {
            const payload = buildSnackPayload(values);

            if (snackId == null) {
                await createSnack(payload);
                notifications.show('Sucursal creada correctamente.', {
                    severity: 'success',
                    autoHideDuration: 5000,
                });
            } else {
                await updateSnack(snackId, payload);
                notifications.show('Sucursal actualizada correctamente.', {
                    severity: 'success',
                    autoHideDuration: 5000,
                });
            }

            setFieldErrors({});
            onClose();
            onSaved?.();
        } catch (submitError) {
            const serverErrors = readServerErrors(submitError);
            if (Object.keys(serverErrors).length > 0) {
                setFieldErrors(serverErrors);
            } else {
                notifications.show(
                    getErrorMessage(submitError, 'Error al eliminar el snack'),
                    { severity: 'error', autoHideDuration: 5000 },
                );
            }
        }
    };

    const isValid = Object.keys(validateAll(values)).length === 0;

    return {
        isCreate,
        loading,
        saving,
        isValid,

        values,
        setFieldValue,
        fieldErrors,
        touched,
        name: values.name,
        description: values.description,
        price: values.price,

        handleNameChange,
        handleDescriptionChange,
        handlePriceChange,
        handleSubmit,
        handleBlur,
    };
}

export type SnackForm = ReturnType<typeof useSnackForm>;