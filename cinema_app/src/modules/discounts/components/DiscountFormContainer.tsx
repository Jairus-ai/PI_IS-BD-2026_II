import * as React from 'react';
import useNotifications from '../../../hooks/useNotifications';
import { validateDiscount } from '../components/DiscountCreate';
import DiscountForm, {
  type FormFieldValue,
  type DiscountFormState,
} from './DiscountForm';

type FormValues = Partial<DiscountFormState['values']>;

interface DiscountFormContainerProps {
  readonly initialValues: FormValues;
  readonly submitAction: (values: FormValues) => Promise<unknown>;
  readonly submitLabel: string;
  readonly successMessage: string;
  readonly errorMessage: string;
  readonly onSuccess?: () => void;
  readonly onClose: () => void;
}

export default function DiscountFormContainer({
  initialValues,
  submitAction,
  submitLabel,
  successMessage,
  errorMessage,
  onSuccess,
  onClose,
}: DiscountFormContainerProps) {
  const notifications = useNotifications();

  const [formState, setFormState] = React.useState<DiscountFormState>(() => ({
    values: initialValues,
    errors: {},
  }));

  const handleFormFieldChange = React.useCallback(
    (name: keyof DiscountFormState['values'], value: FormFieldValue) => {
      setFormState((previous) => {
        const values = { ...previous.values, [name]: value };
        const { issues } = validateDiscount(values);
        const message = issues.find((issue) => issue.path[0] === name)?.message;
        return { values, errors: { ...previous.errors, [name]: message } };
      });
    },
    [],
  );

  const handleFormSubmit = React.useCallback(async () => {
    const { issues } = validateDiscount(formState.values);
    if (issues.length > 0) {
      setFormState((previous) => ({
        ...previous,
        errors: Object.fromEntries(issues.map((issue) => [issue.path[0], issue.message])),
      }));
      return;
    }
    setFormState((previous) => ({ ...previous, errors: {} }));

    try {
      await submitAction(formState.values);
      notifications.show(successMessage, { severity: 'success', autoHideDuration: 3000 });
      onSuccess?.();
      onClose();
    } catch (error) {
      notifications.show(`${errorMessage} Motivo: ${(error as Error).message}`, {
        severity: 'error',
        autoHideDuration: 3000,
      });
    }
  }, [formState.values, submitAction, notifications, successMessage, errorMessage, onSuccess, onClose]);

  return (
    <DiscountForm
      formState={formState}
      onFieldChange={handleFormFieldChange}
      onSubmit={handleFormSubmit}
      onCancel={onClose}
      submitButtonLabel={submitLabel}
    />
  );
}