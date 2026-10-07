import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import useNotifications from '../../../hooks/useNotifications';
import type { Discount } from '../types/discounts';
import { addDiscount } from '../services/discountService';
import DiscountForm, {
  type FormFieldValue,
  type DiscountFormState,
} from './DiscountForm';

type ValidationResult = {
  issues: { message: string; path: (keyof Discount)[] }[];
};

function validateDiscount(discount: Partial<Discount>): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  if (!discount.DISCOUNT_NAME) {
    issues.push({ message: 'Nombre es requerido', path: ['DISCOUNT_NAME'] });
  }
  if (discount.DISCOUNT_PORCENTAGE == null) {
    issues.push({ message: 'Porcentaje es requerido', path: ['DISCOUNT_PORCENTAGE'] });
  }
  if (!discount.DISCOUNT_START_DATE) {
    issues.push({ message: 'Fecha de inicio es requerida', path: ['DISCOUNT_START_DATE'] });
  }
  if (!discount.DISCOUNT_FINISH_DATE) {
    issues.push({ message: 'Fecha de finalización es requerida', path: ['DISCOUNT_FINISH_DATE'] });
  }

  return { issues };
}

const INITIAL_FORM_VALUES: Partial<DiscountFormState['values']> = {};

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ color: 'primary.dark', fontWeight: 700 }}>Nuevo descuento</DialogTitle>
      <DialogContent dividers>
        {open ? (
          <CreateDiscountContent onClose={onClose} onCreated={onCreated} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateDiscountContent({
  onClose,
  onCreated,
}: Readonly<{ onClose: () => void; onCreated?: () => void }>) {
  const notifications = useNotifications();

  const [formState, setFormState] = React.useState<DiscountFormState>(() => ({
    values: INITIAL_FORM_VALUES,
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
      await addDiscount(formValues);
      notifications.show('Descuento creado correctamente.', {
        severity: 'success',
        autoHideDuration: 3000,
      });
      onCreated?.();
      onClose();
    } catch (createError) {
      notifications.show(
        `No se pudo crear el descuento. Motivo: ${(createError as Error).message}`,
        {
          severity: 'error',
          autoHideDuration: 3000,
        },
      );
    }
  }, [formValues, notifications, onClose, onCreated, setFormErrors]);

  return (
    <DiscountForm
      formState={formState}
      onFieldChange={handleFormFieldChange}
      onSubmit={handleFormSubmit}
      onCancel={onClose}
      submitButtonLabel="Crear"
    />
  );
}