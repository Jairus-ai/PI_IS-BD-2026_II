export interface Discount {
  ID_DISCOUNT: number;
  DISCOUNT_START_DATE: string;
  DISCOUNT_FINISH_DATE: string;
  DISCOUNT_PORCENTAGE: number;
  DISCOUNT_NAME: string;
  DISCOUNT_STATE: string; //finished/active/future
  TYPE: string;
  NAME_FK_PRODUCT: string;
  ID_FK_PRODUCT:number;
}

export interface DiscountProduct {
  ID_SNACK: number;
  SNACK_NAME: string;
}