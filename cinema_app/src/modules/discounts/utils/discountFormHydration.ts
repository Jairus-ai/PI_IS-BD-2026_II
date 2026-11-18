import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import type { Dayjs } from 'dayjs';
import type { Discount } from '../types/discounts';
import type { DiscountFormValues } from './discountFormValidation';

dayjs.extend(customParseFormat);

export function parseDate(value: string | null | undefined): Dayjs | null {
    if (!value) {
        return null;
    }

    const parsed = dayjs(value.trim(), ['YYYY-MM-DD', 'DD/MM/YYYY'], true);

    return parsed.isValid() ? parsed : null;
}

export function mapDetailToFormValues(detail: Discount): DiscountFormValues {
    return {
        name: detail.DISCOUNT_NAME ?? '',
        porcentage: detail.DISCOUNT_PORCENTAGE ?? null,
        start_date: parseDate(String(detail.DISCOUNT_START_DATE ?? '')),
        finish_date: parseDate(String(detail.DISCOUNT_FINISH_DATE ?? '')),
        id_prod: detail.ID_FK_PRODUCT ?? null,
        prod_name: detail.NAME_FK_PRODUCT ?? '',
    };
}