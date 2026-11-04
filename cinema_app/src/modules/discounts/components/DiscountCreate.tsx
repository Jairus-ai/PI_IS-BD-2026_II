import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import type { Discount } from '../types/discounts';
import { addDiscount } from '../services/discountService';
import {
  type DiscountFormState,
} from './DiscountForm';
import DiscountFormContainer from '../components/DiscountFormContainer'

type ValidationResult = {
  issues: { message: string; path: (keyof Discount)[] }[];
};

export function validateDiscount(discount: Partial<Discount>): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  if (!discount.DISCOUNT_NAME) {
    issues.push({ message: 'Nombre es requerido', path: ['DISCOUNT_NAME'] });
  }
  else if (discount.DISCOUNT_NAME.length > 50) {
    issues.push({ message: 'Nombre demasiado largo', path: ['DISCOUNT_NAME'] });
  }
  if (discount.DISCOUNT_PORCENTAGE == null) {
    issues.push({ message: 'Porcentaje es requerido', path: ['DISCOUNT_PORCENTAGE'] });
  }else if (discount.DISCOUNT_PORCENTAGE <=0){
    issues.push({message: 'Porcentaje debe ser mayor que 0%', path:['DISCOUNT_PORCENTAGE']});
  }else if (discount.DISCOUNT_PORCENTAGE >100){
    issues.push({message: 'Porcentaje debe ser menor que 100%', path:['DISCOUNT_PORCENTAGE']});
  }
  if (!discount.DISCOUNT_START_DATE) {
    issues.push({ message: 'Fecha de inicio es requerida', path: ['DISCOUNT_START_DATE'] });
  }
  else if(discount.DISCOUNT_START_DATE > (discount.DISCOUNT_FINISH_DATE??0)){
    issues.push({ message: 'Fecha de incio no puede ser despues que fecha de incio', path: ['DISCOUNT_START_DATE'] });
  }
  if (!discount.DISCOUNT_FINISH_DATE) {
    issues.push({ message: 'Fecha de finalización es requerida', path: ['DISCOUNT_FINISH_DATE'] });
  }else if(discount.DISCOUNT_FINISH_DATE < (discount.DISCOUNT_START_DATE??0)){
    issues.push({ message: 'Fecha de finalización no puede ser antes que fecha de incio', path: ['DISCOUNT_FINISH_DATE'] });
  }
  if (!discount.ID_FK_PRODUCT) {
    issues.push({ message: 'Producto es requerido', path: ['ID_FK_PRODUCT'] });
  }

  return { issues };
};

const INITIAL_FORM_VALUES: Partial<DiscountFormState['values']> = {};

export function DiscountDialog({
  title,
  children,
  open,
  onClose,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}>) {
  return(
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ color: 'primary.dark', fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent sx={{ margin: 0, color: 'GrayText' }}>
        Los campos marcados con * son obligatorios
      </DialogContent>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}

interface DiscountCreateProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCreated?: () => void;
}

export default function DiscountCreate({
  open,
  onClose,
  onCreated,
}: DiscountCreateProps) {

  return (
    <DiscountDialog title="Nuevo descuento" open={open} onClose={onClose}>
      {open ? (
        <DiscountFormContainer
          initialValues={INITIAL_FORM_VALUES}
          submitAction={(values) => addDiscount(values, values.TYPE)}
          submitLabel="Crear"
          successMessage="Descuento añadido correctamente."
          errorMessage="No se pudo añadir el descuento."
          onSuccess={onCreated}
          onClose={onClose}
        />
      ) : null}
    </DiscountDialog>
  );
}
