import type { DiscountFormValues } from './discountFormValidation';

export function buildDiscountPayload(values: DiscountFormValues) {
    const { start_date, finish_date, porcentage, id_prod } = values;

    return {
        TYPE:values.type?.trim(),
        DISCOUNT_NAME: values.name.trim(),
        DISCOUNT_PORCENTAGE: porcentage != null && Number.isFinite(porcentage) ? porcentage : null,
        DISCOUNT_START_DATE: start_date?.isValid() ? start_date.format('YYYY-MM-DD') : null,
        DISCOUNT_FINISH_DATE: finish_date?.isValid() ? finish_date.format('YYYY-MM-DD') : null,
        ID_FK_PRODUCT: id_prod,
    };
}