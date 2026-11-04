import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';
import { useDialogs } from '../../../hooks/useDialogs';
import { useAudiovisualFormats, useCreateFee, useUpdateFee } from '../hooks/useFees';
import { normalizeAmount, REQUIRED_FIELD_MESSAGE, validateAmount, validateFeeForm } from '../validators/feeValidator';
import { FEE_TYPE_LABELS, type Fee } from '../types/fees';

const FORM_ID = 'fee-form';
const CREATE_TEXTS = {
  title: 'Crear tarifa',
  submit: 'Crear',
  submitting: 'Creando…',
  success: 'Tarifa agregada',
  saveError: 'No se pudo agregar la tarifa. Intenta de nuevo.'
};
const EDIT_TEXTS = {
  title: 'Modificar tarifa',
  submit: 'Guardar',
  submitting: 'Guardando…',
  success: 'Tarifa actualizada',
  saveError: 'No se pudo actualizar la tarifa. Intenta de nuevo.'
};
const NO_FORMATS_MESSAGE = 'No hay formatos audiovisuales registrados. Primero deben registrarse formatos para poder agregar tarifas.';
const FORMATS_ERROR_MESSAGE = 'No se pudieron cargar los formatos audiovisuales.';

const FEE_TYPES = Object.entries(FEE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

interface AudiovisualFormatOption {
  ID_AUDIOVISUAL_FORMAT: number;
  VIDEO_FORMAT_NAME: string;
  AUDIO_FORMAT_NAME: string;
}

interface FeeFormValues {
  type: string;
  formatId: number | null;
  amount: string;
}

type FeeFormErrors = Partial<Record<keyof FeeFormValues, string>>;

interface FeeErrorResponse {
  message?: string;
  errors?: FeeFormErrors;
}

const EMPTY_VALUES: FeeFormValues = { type: '', formatId: null, amount: '' };

function getInitialValues(fee: Fee | null | undefined): FeeFormValues {
  if (!fee) {
    return EMPTY_VALUES;
  }
  return { type: fee.TYPE, formatId: fee.ID_AUDIOVISUAL_FORMAT, amount: String(fee.AMOUNT) };
}

function hasChanges(values: FeeFormValues, initialValues: FeeFormValues): boolean {
  return (
    values.type !== initialValues.type ||
    values.formatId !== initialValues.formatId ||
    values.amount.trim() !== initialValues.amount
  );
}

function getFormatName(format: AudiovisualFormatOption): string {
  return `${format.VIDEO_FORMAT_NAME} + ${format.AUDIO_FORMAT_NAME}`;
}

interface FeeFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  //without fee the dialog creates one and with an existing oone it modifies it
  readonly fee?: Fee | null;
}

export default function FeeFormDialog({ open, onClose, fee = null }: FeeFormDialogProps) {
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const { formats, isLoadingFormats, formatsError } = useAudiovisualFormats(open);
  const { createFee, isCreatingFee } = useCreateFee();
  const { updateFee, isUpdatingFee } = useUpdateFee();

  const isEdit = fee !== null;
  const texts = isEdit ? EDIT_TEXTS : CREATE_TEXTS;
  const isSaving = isCreatingFee || isUpdatingFee;
  const [initialValues] = useState<FeeFormValues>(() => getInitialValues(fee));

  const [values, setValues] = useState<FeeFormValues>(initialValues);
  const [errors, setErrors] = useState<FeeFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const hasNoFormats = !isLoadingFormats && !formatsError && formats.length === 0;
  const canSubmit = !hasNoFormats && !formatsError && !isSaving;
  const selectedFormat = formats.find((format: AudiovisualFormatOption) => format.ID_AUDIOVISUAL_FORMAT === values.formatId) ?? null;

  const setField = <K extends keyof FeeFormValues>(name: K, value: FeeFormValues[K]) => {
    setValues((previousValues) => ({ ...previousValues, [name]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [name]: undefined }));
    setSaveError(null);
  };

  const showRequiredIfEmpty = (name: keyof FeeFormValues) => {
    const value = values[name];
    if (value === null || String(value).trim() === '') {
      setErrors((previousErrors) => ({ ...previousErrors, [name]: REQUIRED_FIELD_MESSAGE }));
    }
  };

  const handleAmountBlur = () => {
    setErrors((previousErrors) => ({ ...previousErrors, amount: validateAmount(values.amount) }));
  };

  const handleSaveError = (error: unknown) => {
    if (isAxiosError<FeeErrorResponse>(error) && error.response?.data?.errors) {
      setErrors(error.response.data.errors);
      setSaveError(error.response.data.message ?? null);
      return;
    }
    setSaveError(texts.saveError);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current || !canSubmit) {
      return;
    }
    const formErrors = validateFeeForm(values);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    isSubmittingRef.current = true;
    try {
      const feeData = { type: values.type, formatId: values.formatId, amount: normalizeAmount(values.amount) };
      if (isEdit) {
        await updateFee({ id: fee.ID_FEE, fee: feeData });
      } else {
        await createFee(feeData);
      }
      notifications.show(texts.success, { severity: 'success', autoHideDuration: 3000 });
      onClose();
    } catch (error) {
      handleSaveError(error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleClose = async () => {
    if (isSaving) {
      return;
    }
    if (hasChanges(values, initialValues)) {
      const confirmed = await dialogs.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?', {
        title: 'Descartar cambios',
        okText: 'Descartar',
        cancelText: 'Seguir editando'
      });
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  return (
    <CrudDialog
      open={open}
      title={texts.title}
      onClose={() => void handleClose()}
      maxWidth="sm"
      loading={isLoadingFormats}
      actions={
        <>
          <Button onClick={() => void handleClose()}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} variant="contained" disabled={!canSubmit}>
            {isSaving ? texts.submitting : texts.submit}
          </Button>
        </>
      }
    >
      <Stack component="form" id={FORM_ID} noValidate onSubmit={handleSubmit} spacing={2}>
        <RequiredFieldsHint />
        {hasNoFormats && <Alert severity="warning">{NO_FORMATS_MESSAGE}</Alert>}
        {formatsError && <Alert severity="error">{FORMATS_ERROR_MESSAGE}</Alert>}
        {saveError && <Alert severity="error">{saveError}</Alert>}

        <TextField
          select
          required
          label="Tipo de tarifa"
          value={values.type}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setField('type', event.target.value)}
          onBlur={() => showRequiredIfEmpty('type')}
          error={Boolean(errors.type)}
          helperText={errors.type ?? ' '}
          disabled={hasNoFormats}
        >
          {FEE_TYPES.map((feeType) => (
            <MenuItem key={feeType.value} value={feeType.value}>
              {feeType.label}
            </MenuItem>
          ))}
        </TextField>

        <Autocomplete
          options={formats as AudiovisualFormatOption[]}
          value={selectedFormat}
          onChange={(_event, format) => setField('formatId', format?.ID_AUDIOVISUAL_FORMAT ?? null)}
          onBlur={() => showRequiredIfEmpty('formatId')}
          getOptionLabel={getFormatName}
          isOptionEqualToValue={(option, value) => option.ID_AUDIOVISUAL_FORMAT === value.ID_AUDIOVISUAL_FORMAT}
          noOptionsText="No hay formatos"
          disabled={hasNoFormats}
          renderInput={(params) => (
            <TextField
              {...params}
              required
              label="Formato audiovisual"
              error={Boolean(errors.formatId)}
              helperText={errors.formatId ?? ' '}
            />
          )}
        />

        <TextField
          required
          label="Monto"
          value={values.amount}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setField('amount', event.target.value)}
          onBlur={handleAmountBlur}
          error={Boolean(errors.amount)}
          helperText={errors.amount ?? ' '}
          disabled={hasNoFormats}
          placeholder="4500"
          slotProps={{
            input: { startAdornment: <InputAdornment position="start">₡</InputAdornment> },
            htmlInput: { inputMode: 'decimal' }
          }}
        />
      </Stack>
    </CrudDialog>
  );
}
