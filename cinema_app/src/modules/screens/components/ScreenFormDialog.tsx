import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import { DetailField } from '../../../components/crud/DetailField';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';
import { useCreateScreen, useScreenLocations } from '../hooks/useScreens';
import {
  REQUIRED_FIELD_MESSAGE,
  buildScreenPayload,
  getCapacity,
  validateRangeField,
  validateScreenForm
} from '../validators/screenValidator';
import { SCREEN_TYPE_LABELS, type ScreenLocation, type ScreenType } from '../types/screens';

const FORM_ID = 'screen-form';
const SUCCESS_MESSAGE = 'Sala agregada correctamente';
const SAVE_ERROR_MESSAGE = 'No se pudo agregar la sala';
const NO_LOCATIONS_MESSAGE = 'No tiene sucursales disponibles para agregar salas.';
const LOCATIONS_ERROR_MESSAGE = 'No se pudieron cargar las sucursales.';
const EMPTY_CAPACITY = 'Se calcula con las filas y los asientos por fila';

const SCREEN_TYPES = (Object.keys(SCREEN_TYPE_LABELS) as ScreenType[])
  .map((type) => ({ value: type, label: SCREEN_TYPE_LABELS[type] }));

interface ScreenFormValues {
  locationId: number | '';
  type: ScreenType | '';
  rows: string;
  seatsPerRow: string;
  maintenanceTime: string;
  addsTime: string;
}

type ScreenFormErrors = Partial<Record<keyof ScreenFormValues, string>>;
type RangeField = 'rows' | 'seatsPerRow' | 'maintenanceTime' | 'addsTime';

interface ScreenErrorResponse {
  errors?: ScreenFormErrors;
}

const EMPTY_VALUES: ScreenFormValues = {
  locationId: '',
  type: '',
  rows: '',
  seatsPerRow: '',
  maintenanceTime: '',
  addsTime: ''
};

const RANGE_FIELDS: { name: RangeField; label: string; minutes?: boolean }[] = [
  { name: 'rows', label: 'Cantidad de filas' },
  { name: 'seatsPerRow', label: 'Asientos por fila' },
  { name: 'maintenanceTime', label: 'Tiempo de mantenimiento', minutes: true },
  { name: 'addsTime', label: 'Tiempo de anuncios', minutes: true }
];

interface ScreenFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export default function ScreenFormDialog({ open, onClose }: ScreenFormDialogProps) {
  const notifications = useNotifications();
  const { locations, isLoadingLocations, locationsError } = useScreenLocations(open);
  const { createScreen, isCreatingScreen } = useCreateScreen();

  const [values, setValues] = useState<ScreenFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ScreenFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const hasNoLocations = !isLoadingLocations && !locationsError && locations.length === 0;
  const canSubmit = !hasNoLocations && !locationsError && !isCreatingScreen;
  const capacity = getCapacity(values.rows, values.seatsPerRow);

  const setField = <K extends keyof ScreenFormValues>(name: K, value: ScreenFormValues[K]) => {
    setValues((previousValues) => ({ ...previousValues, [name]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [name]: undefined }));
    setSaveError(null);
  };

  const showRequiredIfEmpty = (name: 'locationId' | 'type') => {
    if (values[name] === '') {
      setErrors((previousErrors) => ({ ...previousErrors, [name]: REQUIRED_FIELD_MESSAGE }));
    }
  };

  const handleRangeBlur = (name: RangeField) => {
    setErrors((previousErrors) => ({ ...previousErrors, [name]: validateRangeField(name, values[name]) }));
  };

  const handleSaveError = (error: unknown) => {
    if (isAxiosError<ScreenErrorResponse>(error) && error.response?.data?.errors) {
      setErrors(error.response.data.errors);
    }
    setSaveError(SAVE_ERROR_MESSAGE);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmittingRef.current || !canSubmit) {
      return;
    }
    const formErrors = validateScreenForm(values);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    isSubmittingRef.current = true;
    try {
      await createScreen(buildScreenPayload(values));
      notifications.show(SUCCESS_MESSAGE, { severity: 'success', autoHideDuration: 3000 });
      onClose();
    } catch (error) {
      handleSaveError(error);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleClose = () => {
    if (!isCreatingScreen) {
      onClose();
    }
  };

  return (
    <CrudDialog
      open={open}
      title="Agregar sala"
      onClose={handleClose}
      maxWidth="sm"
      loading={isLoadingLocations}
      actions={
        <>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button type="submit" form={FORM_ID} variant="contained" disabled={!canSubmit}>
            {isCreatingScreen ? 'Agregando…' : 'Agregar'}
          </Button>
        </>
      }
    >
      <Stack component="form" id={FORM_ID} noValidate onSubmit={handleSubmit} spacing={2}>
        <RequiredFieldsHint />
        {hasNoLocations && <Alert severity="warning">{NO_LOCATIONS_MESSAGE}</Alert>}
        {locationsError && <Alert severity="error">{LOCATIONS_ERROR_MESSAGE}</Alert>}
        {saveError && <Alert severity="error">{saveError}</Alert>}

        <TextField
          select
          required
          label="Sucursal"
          value={values.locationId}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setField('locationId', Number(event.target.value))}
          onBlur={() => showRequiredIfEmpty('locationId')}
          error={Boolean(errors.locationId)}
          helperText={errors.locationId ?? ' '}
          disabled={hasNoLocations}
        >
          {locations.map((location: ScreenLocation) => (
            <MenuItem key={location.ID_LOCATION} value={location.ID_LOCATION}>
              {location.LOCATION_NAME}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          required
          label="Tipo de sala"
          value={values.type}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setField('type', event.target.value as ScreenType)}
          onBlur={() => showRequiredIfEmpty('type')}
          error={Boolean(errors.type)}
          helperText={errors.type ?? ' '}
          disabled={hasNoLocations}
        >
          {SCREEN_TYPES.map((screenType) => (
            <MenuItem key={screenType.value} value={screenType.value}>
              {screenType.label}
            </MenuItem>
          ))}
        </TextField>

        {RANGE_FIELDS.map((field) => (
          <TextField
            key={field.name}
            required
            label={field.label}
            value={values[field.name]}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setField(field.name, event.target.value)}
            onBlur={() => handleRangeBlur(field.name)}
            error={Boolean(errors[field.name])}
            helperText={errors[field.name] ?? ' '}
            disabled={hasNoLocations}
            slotProps={{
              input: field.minutes ? { endAdornment: <InputAdornment position="end">min</InputAdornment> } : undefined,
              htmlInput: { inputMode: 'numeric' }
            }}
          />
        ))}

        <DetailField label="Capacidad" value={capacity === null ? EMPTY_CAPACITY : `${capacity} asientos`} />
      </Stack>
    </CrudDialog>
  );
}
