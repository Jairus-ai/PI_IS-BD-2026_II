import * as React from 'react';
import type { Dayjs } from 'dayjs';
import { useDiscounts } from './useDiscounts';
import useNotifications from '../../../hooks/useNotifications';
import { readServerErrors } from '../utils/discountFormUtils';
import type { ServerErrors } from '../utils/discountFormUtils';
import { validateAll } from '../utils/discountFormValidation';
import type { DiscountFormValues } from '../utils/discountFormValidation';
import { mapDetailToFormValues } from '../utils/discountFormHydration';
import { buildDiscountPayload } from '../utils/discountPayloadBuilder';
import type { DiscountProduct } from '../types/discounts';

export const DISCOUNT_TYPES = ['SNACK', 'PELICULA'] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

const initialFormValues: DiscountFormValues = {
    name: '',
    porcentage: null,
    start_date: null,
    finish_date: null,
    type: null,
    id_prod: null,
    prod_name: '',
};

const ERROR_KEY: Record<keyof DiscountFormValues, string> = {
    name: 'DISCOUNT_NAME',
    porcentage: 'DISCOUNT_PORCENTAGE',
    start_date: 'DISCOUNT_START_DATE',
    finish_date: 'DISCOUNT_FINISH_DATE',
    type: 'TYPE',
    id_prod: 'ID_FK_PRODUCT',
    prod_name: 'NAME_FK_PRODUCT',
};

const ALL_ERROR_KEYS = Object.values(ERROR_KEY);

export interface UseDiscountFormArgs {
    discountId: number | null;
    open: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export function useDiscountForm({ discountId, open, onClose, onSaved }: UseDiscountFormArgs) {
    const isCreate = discountId == null;

    const notifications = useNotifications();

    const [values, setValues] = React.useState<DiscountFormValues>(initialFormValues);
    const [fieldErrors, setFieldErrors] = React.useState<ServerErrors>({});
    const [touched, setTouched] = React.useState<Record<string, boolean>>({});

    const {
        discountDetail,
        isLoadingDetail,
        discountProducts,
        isLoadingProducts,
        createDiscount,
        updateDiscount,
        isCreatingDiscount,
        isUpdatingDiscount,
    } = useDiscounts(1, open && !isCreate ? discountId : null, values.type);

    const touchedRef = React.useRef<Record<string, boolean>>({});

    const saving = isCreatingDiscount || isUpdatingDiscount;
    const loading = !isCreate && isLoadingDetail;

    const validateAndSet = (merged: DiscountFormValues, touchedMap: Record<string, boolean>) => {
        const all = validateAll(merged);
        const next: ServerErrors = {};
        for (const key of Object.keys(all)) {
            if (touchedMap[key]) {
                next[key] = all[key];
            }
        }
        setFieldErrors(next);
    };

    const touchAndValidate = (errorKey: string, currentValues: DiscountFormValues) => {
        const nextTouched = { ...touchedRef.current, [errorKey]: true };
        touchedRef.current = nextTouched;
        setTouched(nextTouched);
        validateAndSet(currentValues, nextTouched);
    };

    const handleBlur = (errorKey: string) => () => {
        touchAndValidate(errorKey, values);
    };

    const setFieldValue = <K extends keyof DiscountFormValues>(
        field: K,
        value: DiscountFormValues[K],
    ) => {
        const updated = { ...values, [field]: value };
        setValues(updated);
        touchAndValidate(ERROR_KEY[field], updated);
    };

    const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFieldValue('name', event.target.value);
    };

    const handlePorcentageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        setFieldValue('porcentage', raw === '' ? null : Number(raw));
    };

    const handleStartDateChange = (date: Dayjs | null) => {
        setFieldValue('start_date', date);
    };

    const handleFinishDateChange = (date: Dayjs | null) => {
        setFieldValue('finish_date', date);
    };

    const handleTypeChange = (type: DiscountType | null) => {
        const updated = { ...values, type, id_prod: null, prod_name: '' };
        setValues(updated);
        touchAndValidate('TYPE', updated);
    };

    const handleProductChange = (product: DiscountProduct | null) => {
        const updated = {
            ...values,
            id_prod: product?.ID_PRODUCT ?? null,
            prod_name: product?.PRODUCT_NAME ?? '',
        };
        setValues(updated);
        touchAndValidate('ID_FK_PRODUCT', updated);
    };

    React.useEffect(() => {
        if (!open) {
            return;
        }

        touchedRef.current = {};
        setTouched({});
        setFieldErrors({});

        setValues(
            !isCreate && discountDetail
                ? mapDetailToFormValues(discountDetail)
                : initialFormValues,
        );
    }, [open, isCreate, discountDetail]);

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
            const payload = buildDiscountPayload(values);
            const type = values.type as DiscountType;

            if (discountId == null) {
                await createDiscount(payload, type);
                notifications.show('Descuento creado correctamente.', {
                    severity: 'success',
                    autoHideDuration: 5000,
                });
            } else {
                await updateDiscount(discountId, payload, type);
                notifications.show('Descuento actualizado correctamente.', {
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
                    `Error al guardar el descuento: ${(submitError as Error).message}`,
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
        porcentage: values.porcentage,
        start_date: values.start_date,
        finish_date: values.finish_date,
        type: values.type,
        id_prod: values.id_prod,
        prod_name: values.prod_name,

        handleNameChange,
        handlePorcentageChange,
        handleStartDateChange,
        handleFinishDateChange,
        handleTypeChange,
        handleProductChange,
        handleSubmit,
        handleBlur,

        products: discountProducts,
        isLoadingProducts,
    };
}

export type DiscountForm = ReturnType<typeof useDiscountForm>;