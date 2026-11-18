import type { Dayjs } from 'dayjs';
import type { ServerErrors } from './discountFormUtils';

export interface DiscountFormValues {
    start_date: Dayjs | null;
    finish_date: Dayjs | null;
    porcentage: number | null;
    name: string;
    prod_name: string;
    id_prod: number | null;
}

export function validateAll(values: DiscountFormValues): ServerErrors {
    const errors: ServerErrors = {};
    const { start_date, finish_date, porcentage } = values;

    const name = values.name.trim();
    if (!name) {
        errors.DISCOUNT_NAME = 'Campo obligatorio';
    } else if (name.length > 50) {
        errors.DISCOUNT_NAME = 'El nombre no puede exceder 50 caracteres.';
    }

    if (porcentage == null || !Number.isFinite(porcentage)) {
        errors.DISCOUNT_PORCENTAGE = 'Porcentaje es requerido';
    } else if (porcentage <= 0) {
        errors.DISCOUNT_PORCENTAGE = 'Porcentaje debe ser mayor que 0%';
    } else if (porcentage > 100) {
        errors.DISCOUNT_PORCENTAGE = 'Porcentaje no puede ser mayor que 100%';
    }

    const startValid = Boolean(start_date?.isValid());
    const finishValid = Boolean(finish_date?.isValid());

    if (!startValid) {
        errors.DISCOUNT_START_DATE = 'Fecha de inicio es requerida';
    }
    if (!finishValid) {
        errors.DISCOUNT_FINISH_DATE = 'Fecha de finalización es requerida';
    }

    if (startValid && finishValid && start_date!.isAfter(finish_date!, 'day')) {
        errors.DISCOUNT_START_DATE = 'La fecha de inicio no puede ser posterior a la de finalización';
        errors.DISCOUNT_FINISH_DATE = 'La fecha de finalización no puede ser anterior a la de inicio';
    }

    if (!values.id_prod) {
        errors.ID_FK_PRODUCT = 'Producto es requerido';
    }

    return errors;
}