import * as React from 'react';
import type { Dayjs } from 'dayjs';
import { useLocations } from './useLocations';
import useNotifications from '../../../hooks/useNotifications';
import { readServerErrors } from '../utils/locationFormUtils';
import type { ServerErrors } from '../utils/locationFormUtils';
import { validateAll } from '../utils/locationFormValidation';
import type { LocationFormValues } from '../utils/locationFormValidation';
import { mapDetailToFormValues } from '../utils/locationFormHydration';
import { buildLocationPayload } from '../utils/locationPayloadBuilder';
import type { Canton, Province } from '../types/locations';

const initialFormValues: LocationFormValues = {
    name: '',
    opening_hour: null,
    closing_hour: null,
    canton_name: '',
    province_id:null,
};

const ERROR_KEY: Record<keyof LocationFormValues, string> = {
    name: 'LOCATION_NAME',
    opening_hour: 'OPENING_HOUR',
    closing_hour: 'CLOSING_HOUR',
    canton_name: 'CANTON_NAME',
    province_id: 'PROVINCE_ID',
};

const ALL_ERROR_KEYS = Object.values(ERROR_KEY);

export interface UseLocationFormArgs {
    locationId: number | null;
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export function useLocationForm({ locationId, open, onClose, onSaved }: UseLocationFormArgs) {
    const isCreate = locationId == null;

    const notifications = useNotifications();

    const [values, setValues] = React.useState<LocationFormValues>(initialFormValues);
    const [fieldErrors, setFieldErrors] = React.useState<ServerErrors>({});
    const [touched, setTouched] = React.useState<Record<string, boolean>>({});

    const {
        locationDetail,
        isLoadingDetail,
        createLocation,
        updateLocation,
        isCreatingLocation,
        isUpdatingLocation,
        locationCantons,
        isLoadingCantons,
        locationProvinces,
        isLoadingProvinces
    } = useLocations(1, open && !isCreate ? locationId : null, values.province_id);

    const touchedRef = React.useRef<Record<string, boolean>>({});

    const saving = isCreatingLocation || isUpdatingLocation;
    const loading = !isCreate && isLoadingDetail;

    const validateAndSet = (
        merged: LocationFormValues,
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

    const touchAndValidate = (errorKey: string, currentValues: LocationFormValues) => {
        const nextTouched = { ...touchedRef.current, [errorKey]: true };
        touchedRef.current = nextTouched;
        setTouched(nextTouched);
        validateAndSet(currentValues, nextTouched);
    };

    const handleBlur = (errorKey: string) => () => {
        touchAndValidate(errorKey, values);
    };

    const setFieldValue = <K extends keyof LocationFormValues>(
        field: K,
        value: LocationFormValues[K],
    ) => {
        const updated = { ...values, [field]: value };
        setValues(updated);
        touchAndValidate(ERROR_KEY[field], updated);
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue('name', event.target.value);
    };

    const handleOpHourChange = (hour: Dayjs | null) => {
        setFieldValue('opening_hour', hour);
    };

    const handleCloseHourChange = (hour: Dayjs | null) => {
        setFieldValue('closing_hour', hour);
    };

    const handleProvinceChange = (province: Province | null) => {
        const updated = {
            ...values,
            province_id: province?.ID_PROVINCE ?? null,
            canton_name: ''
        };
        setValues(updated);
        touchAndValidate('PROVINCE_NAME', updated);
};

    const handleCantonChange = (canton: Canton | null) => {
        setFieldValue('canton_name', canton?.CANTON_NAME ?? '');
    };

    React.useEffect(() => {
        if (!open) {
            return;
        }

        touchedRef.current = {};
        setTouched({});
        setFieldErrors({});

        setValues(
            !isCreate && locationDetail
                ? mapDetailToFormValues(locationDetail)
                : initialFormValues,
        );
    }, [open, isCreate, locationDetail]);

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
            const payload = buildLocationPayload(values);

            if (locationId == null) {
                await createLocation(payload);
                notifications.show('Sucursal creada correctamente.', {
                    severity: 'success',
                    autoHideDuration: 5000,
                });
            } else {
                await updateLocation(locationId, payload);
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
                    `Error al guardar la sucursal: ${(submitError as Error).message}`,
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
        opening_hour: values.opening_hour,
        closing_hour: values.closing_hour,
        canton_name: values.canton_name,
        province_id: values.province_id,

        handleNameChange,
        handleOpHourChange,
        handleCloseHourChange,
        handleCantonChange,
        handleProvinceChange,
        handleSubmit,
        handleBlur,

        cantons: locationCantons,
        isLoadingCantons,

        provinces:locationProvinces,
        isLoadingProvinces,
    };
}

export type LocationForm = ReturnType<typeof useLocationForm>;