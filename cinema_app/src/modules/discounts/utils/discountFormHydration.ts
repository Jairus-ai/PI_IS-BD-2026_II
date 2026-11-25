import {parseDate} from '../utils/discountFormUtils'
import type { Discount } from '../types/discounts';
import type { DiscountFormValues } from './discountFormValidation';

export function mapDetailToFormValues(detail: Discount): DiscountFormValues {
    return {
        type: detail.TYPE,
        name: detail.DISCOUNT_NAME ?? '',
        porcentage: detail.DISCOUNT_PORCENTAGE ?? null,
        start_date: parseDate(String(detail.DISCOUNT_START_DATE ?? '')),
        finish_date: parseDate(String(detail.DISCOUNT_FINISH_DATE ?? '')),
        id_prod: detail.ID_FK_PRODUCT ?? null,
        prod_name: detail.NAME_FK_PRODUCT ?? '',
    };
}