import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import type { Discount } from '../types/discounts';
import {  editDiscount } from '../services/discountService';
import { useDiscounts } from '../hooks/useDiscounts';
import {type DiscountFormState,} from './DiscountForm';
import { DiscountDialog} from '../components/DiscountCreate'
import DiscountFormContainer from '../components/DiscountFormContainer'
import { useQueryClient } from '@tanstack/react-query';

function toFormValues(d: Discount): Partial<DiscountFormState['values']> {
  const toISO = (s: string) => s.split('/').reverse().join('-')
  
  return {
    DISCOUNT_NAME: d.DISCOUNT_NAME,
    DISCOUNT_PORCENTAGE: d.DISCOUNT_PORCENTAGE,
    DISCOUNT_START_DATE: toISO(String(d.DISCOUNT_START_DATE)),
    DISCOUNT_FINISH_DATE: toISO(String(d.DISCOUNT_FINISH_DATE)),
    TYPE: d.TYPE,
    ID_FK_PRODUCT: d.ID_FK_PRODUCT,
    NAME_FK_PRODUCT:d.NAME_FK_PRODUCT
  };
}

interface DiscountEditProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onEdited?: () => void;
  readonly discountID: number | null;
}

export default function DiscountEdit({
  open,
  onClose,
  onEdited,
  discountID,
}: DiscountEditProps) {
  const { discountDetail, isLoadingDetail } = useDiscounts(discountID);
  const queryClient = useQueryClient();

  return (
    <DiscountDialog open={open} title="Editar descuento" onClose={onClose}>
      {open && (isLoadingDetail || !discountDetail) ? <CircularProgress /> : null}
      {open && discountDetail ? (
        <DiscountFormContainer
          key={discountID}
          initialValues={toFormValues(discountDetail)}
          submitAction={(values) =>
            editDiscount(discountDetail.ID_DISCOUNT, values, values.TYPE)
          }
          submitLabel="Guardar"
          successMessage="Descuento editado correctamente."
          errorMessage="No se pudo editar el descuento."
          onSuccess={() => {
            void queryClient.invalidateQueries({ queryKey: ['discount'] });
            onEdited?.();
          }}
          onClose={onClose}
        />
      ) : null}
    </DiscountDialog>
  );
};