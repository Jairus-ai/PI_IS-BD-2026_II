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
import { useAudiovisualFormats, useCreateFee } from '../hooks/useFees';
import { normalizeAmount, REQUIRED_FIELD_MESSAGE, validateAmount, validateFeeForm } from '../validators/feeValidator';
import { FEE_TYPE_LABELS } from '../types/fees';

const FORM_ID = 'fee-form';
const SUCCESS_MESSAGE = 'Tarifa agregada';
const SAVE_ERROR_MESSAGE = 'No se pudo agregar la tarifa. Intenta de nuevo.';
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

function getFormatName(format: AudiovisualFormatOption): string {
  return `${format.VIDEO_FORMAT_NAME} + ${format.AUDIO_FORMAT_NAME}`;
}

interface FeeFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export default function FeeFormDialog({ open, onClose }: FeeFormDialogProps) {
  const notifications = useNotifications();
  const { formats, isLoadingFormats, formatsError } = useAudiovisualFormats(open);
  const { createFee, isCreatingFee } = useCreateFee();

  const [values, setValues] = useState<FeeFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FeeFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const hasNoFormats = !isLoadingFormats && !formatsError && formats.length === 0;
  const canSubmit = !hasNoFormats && !formatsError && !isCreatingFee;
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
    setSaveError(SAVE_ERROR_MESSAGE);
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
      await createFee({ type: values.type, formatId: values.formatId, amount: normalizeAmount(values.amount) });
      notifications.show(SUCCESS_MESSAGE, { severity: 'success', autoHideDuration: 3000 });
      onClose();
    } catch (error) {
      handleSaveError(error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <CrudDialog
      open={open}
      title="Crear tarifa"
      onClose={onClose}
      maxWidth="sm"
      loading={isLoadingFormats}
      actions={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} variant="contained" disabled={!canSubmit}>
            {isCreatingFee ? 'Creando…' : 'Crear'}
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
