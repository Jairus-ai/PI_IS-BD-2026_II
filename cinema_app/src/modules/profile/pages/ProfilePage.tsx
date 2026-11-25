import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { isAxiosError } from 'axios';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import PersonIcon from '@mui/icons-material/Person';
import PageContainer from '../../../components/common/PageContainer';
import useNotifications from '../../../hooks/useNotifications';
import ProfileChangesDialog from '../components/ProfileChangesDialog';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import {
  IDENTIFICATION_LABELS,
  ROLE_LABELS,
  formatBirthdate,
  getLocationsLabel,
  type Profile
} from '../types/profile';
import {
  FIELD_LABELS,
  cleanFormValues,
  getProfileChanges,
  toFormValues,
  validateProfileForm,
  type ProfileChange,
  type ProfileField,
  type ProfileFormErrors,
  type ProfileFormValues
} from '../utils/profileForm';

const LOAD_ERROR_MESSAGE = 'No se pudo cargar la información personal';
const SAVE_SUCCESS_MESSAGE = 'Información actualizada correctamente';
const SAVE_ERROR_MESSAGE = 'No se pudo actualizar la información';
const NOTIFICATION_MS = 5000;
const AVATAR_SIZE = 160;
const HOME_BREADCRUMB = [{ title: 'Volver al inicio', path: '/' }];
const VIEW_ONLY_SX = { pointerEvents: 'none' };
const VIEW_ONLY_INPUT = { tabIndex: -1 };

const EMPTY_FORM: ProfileFormValues = { firstName: '', middleName: '', firstSurname: '', lastSurname: '', phoneNumber: '' };

function getServerErrors(error: unknown): ProfileFormErrors {
  return isAxiosError<{ errors?: ProfileFormErrors }>(error) ? error.response?.data?.errors ?? {} : {};
}

function ReadOnlyField({ label, value, editing }: Readonly<{ label: string; value: string; editing: boolean }>) {
  return (
    <TextField
      label={label}
      value={value}
      fullWidth
      disabled={editing}
      sx={editing ? undefined : VIEW_ONLY_SX}
      slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true }, htmlInput: VIEW_ONLY_INPUT }}
    />
  );
}

export default function ProfilePage() {
  const { profile, isLoadingProfile, profileError, refetchProfile } = useProfile();
  const { saveProfile, isSavingProfile } = useUpdateProfile();
  const notifications = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState<ProfileFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [pendingChanges, setPendingChanges] = useState<ProfileChange[]>([]);
  const savingRef = useRef(false);
  const original = useMemo(() => (profile ? toFormValues(profile as Profile) : EMPTY_FORM), [profile]);
  const changes = useMemo(() => getProfileChanges(values, original), [values, original]);

  const startEditing = () => {
    setValues(original);
    setErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setValues(original);
    setErrors({});
    setIsEditing(false);
  };

  const handleChange = (field: ProfileField) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((previous) => ({ ...previous, [field]: event.target.value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSave = () => {
    const formErrors = validateProfileForm(values, original);
    setErrors(formErrors);
    if (Object.keys(formErrors).length === 0) {
      setPendingChanges(changes);
    }
  };

  const handleConfirm = async () => {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    try {
      await saveProfile(cleanFormValues(values));
      setPendingChanges([]);
      setIsEditing(false);
      notifications.show(SAVE_SUCCESS_MESSAGE, { severity: 'success', autoHideDuration: NOTIFICATION_MS });
    } catch (error) {
      setPendingChanges([]);
      setErrors(getServerErrors(error));
      notifications.show(SAVE_ERROR_MESSAGE, { severity: 'error', autoHideDuration: NOTIFICATION_MS });
    } finally {
      savingRef.current = false;
    }
  };

  const renderEditableField = (field: ProfileField) => (
    <TextField
      label={FIELD_LABELS[field]}
      value={isEditing ? values[field] : original[field]}
      onChange={handleChange(field)}
      required={isEditing && (field === 'firstName' || field === 'firstSurname' || field === 'phoneNumber')}
      error={Boolean(errors[field])}
      helperText={errors[field]}
      fullWidth
      sx={isEditing ? undefined : VIEW_ONLY_SX}
      slotProps={{
        input: { readOnly: !isEditing },
        inputLabel: { shrink: true },
        htmlInput: { maxLength: field === 'phoneNumber' ? 15 : 50, ...(isEditing ? {} : VIEW_ONLY_INPUT) }
      }}
    />
  );

  const renderContent = () => {
    if (isLoadingProfile) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Cargando información personal" />
        </Box>
      );
    }

    if (profileError || !profile) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchProfile()}>
              Reintentar
            </Button>
          }
        >
          {LOAD_ERROR_MESSAGE}
        </Alert>
      );
    }

    const data = profile as Profile;
    return (
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
        <Stack spacing={2} sx={{ alignItems: 'center', minWidth: AVATAR_SIZE }}>
          <Avatar sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE, bgcolor: 'transparent', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <PersonIcon sx={{ fontSize: AVATAR_SIZE * 0.75 }} />
          </Avatar>
          {!isEditing && (
            <Button variant="contained" disableElevation onClick={startEditing}>
              Editar perfil
            </Button>
          )}
        </Stack>

        <Stack spacing={3} sx={{ flex: 1, width: '100%' }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>{renderEditableField('firstName')}</Grid>
            <Grid size={{ xs: 12, sm: 6 }}>{renderEditableField('middleName')}</Grid>
            <Grid size={{ xs: 12, sm: 6 }}>{renderEditableField('firstSurname')}</Grid>
            <Grid size={{ xs: 12, sm: 6 }}>{renderEditableField('lastSurname')}</Grid>
            <Grid size={12}>
              <ReadOnlyField label="Correo electrónico" value={data.email} editing={isEditing} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadOnlyField label={IDENTIFICATION_LABELS[data.identificationType]} value={data.identificationNumber} editing={isEditing} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>{renderEditableField('phoneNumber')}</Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadOnlyField label="Fecha de nacimiento" value={formatBirthdate(data.birthdate)} editing={isEditing} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <ReadOnlyField label="Rol" value={ROLE_LABELS[data.role]} editing={isEditing} />
            </Grid>
            {data.locations !== null && (
              <Grid size={12}>
                <ReadOnlyField label="Sucursales asignadas" value={getLocationsLabel(data)} editing={isEditing} />
              </Grid>
            )}
          </Grid>

          {isEditing && (
            <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
              <Button variant="contained" color="inherit" disableElevation onClick={cancelEditing}>
                Cancelar
              </Button>
              <Button variant="contained" disableElevation disabled={changes.length === 0} onClick={handleSave}>
                Guardar
              </Button>
            </Stack>
          )}
        </Stack>
      </Stack>
    );
  };

  return (
    <PageContainer title={isEditing ? 'Editar perfil' : 'Mi perfil'} breadcrumbs={HOME_BREADCRUMB}>
      {renderContent()}
      <ProfileChangesDialog
        open={pendingChanges.length > 0}
        changes={pendingChanges}
        isSaving={isSavingProfile}
        onCancel={() => setPendingChanges([])}
        onConfirm={() => void handleConfirm()}
      />
    </PageContainer>
  );
}
