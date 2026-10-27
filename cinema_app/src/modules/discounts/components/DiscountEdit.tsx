import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import CircularProgress from '@mui/material/CircularProgress';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import useNotifications from '../../../hooks/useNotifications';
import type { Discount } from '../types/discounts';
import {  editDiscount } from '../services/discountService';
import { useDiscounts } from '../hooks/useDiscounts';
import DiscountForm, {
  type FormFieldValue,
  type DiscountFormState,
} from './DiscountForm';
import { validateDiscount} from '../components/DiscountCreate'

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

interface DiscountModifyProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onEdited?: () => void;
  readonly discountID: number | null;
}

export default function DiscountModify({
  open,
  onClose,
  onEdited,
  discountID,
}: DiscountModifyProps) {
  const { discountDetail, isLoadingDetail } = useDiscounts(discountID);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ color: 'primary.dark', fontWeight: 700 }}>Editar descuento</DialogTitle>
      <DialogContent sx={{ margin: 0, color: 'GrayText' }}>
        Los campos marcados con * son obligatorios
      </DialogContent>
      <DialogContent>
        {open && (isLoadingDetail || !discountDetail) ? <CircularProgress /> : null}
        {open && discountDetail ? (
          <ModifyDiscountContent
            key={discountID}
            discount={discountDetail}
            onClose={onClose}
            onEdited={onEdited}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ModifyDiscountContent({
  discount,
  onClose,
  onEdited,
}: Readonly<{ discount: Discount; onClose: () => void; onEdited?: () => void }>) {
  const notifications = useNotifications();

  const [formState, setFormState] = React.useState<DiscountFormState>(() => ({
    values: toFormValues(discount),
    errors: {},
  }));
  const formValues = formState.values;

  const setFormValues = React.useCallback(
    (newFormValues: Partial<DiscountFormState['values']>) => {
      setFormState((previousState) => ({
        ...previousState,
        values: newFormValues,
      }));
    },
    [],
  );

  const setFormErrors = React.useCallback(
    (newFormErrors: Partial<DiscountFormState['errors']>) => {
      setFormState((previousState) => ({
        ...previousState,
        errors: newFormErrors,
      }));
    },
    [],
  );

  const handleFormFieldChange = React.useCallback(
    (name: keyof DiscountFormState['values'], value: FormFieldValue) => {
      const newFormValues = { ...formValues, [name]: value };
      setFormValues(newFormValues);

      const { issues } = validateDiscount(newFormValues);
      const message = issues.find((issue) => issue.path[0] === name)?.message;

      setFormState((previousState) => ({
        ...previousState,
        errors: { ...previousState.errors, [name]: message },
      }));
    },
    [formValues, setFormValues],
  );

  const handleFormSubmit = React.useCallback(async () => {
    const { issues } = validateDiscount(formValues);
    if (issues.length > 0) {
      setFormErrors(
        Object.fromEntries(issues.map((issue) => [issue.path[0], issue.message])),
      );
      return;
    }
    setFormErrors({});

    try {
      await editDiscount(discount.ID_DISCOUNT,formValues, formValues.TYPE);
      notifications.show('Descuento editado correctamente.', {
        severity: 'success',
        autoHideDuration: 3000,
      });
      onEdited?.();
      onClose();
    } catch (createError) {
      notifications.show(
        `No se pudo editar el descuento. Motivo: ${(createError as Error).message}`,
        {
          severity: 'error',
          autoHideDuration: 3000,
        },
      );
    }
  }, [formValues, notifications, onClose, onEdited, setFormErrors]);

  return (
    <DiscountForm
      formState={formState}
      onFieldChange={handleFormFieldChange}
      onSubmit={handleFormSubmit}
      onCancel={onClose}
      submitButtonLabel="Guardar"
    />
  );
}