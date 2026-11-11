import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { firstError } from '../utils/locationFormUtils';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import type { LocationForm } from '../hooks/useLocationForm';
import Autocomplete from '@mui/material/Autocomplete';

interface FieldErrorProps {
    readonly show: boolean;
    readonly message: string;
}

interface LocationFormFieldsProps {
    readonly form: LocationForm;
    readonly formId: string;
}

function FieldError({ show, message }: FieldErrorProps) {
    return <>{(show && message) || ' '}</>;
}

export default function LocationFormFields({ form, formId }: LocationFormFieldsProps) {
    const err = (name: string) =>
        Boolean(form.touched[name]) && Boolean(form.fieldErrors[name]);

    return (
        <Box
            component="form"
            id={formId}
            onSubmit={(event) => {
                void form.handleSubmit(event);
            }}
            noValidate
            autoComplete="off"
        >
            <Stack spacing={2}>
                <TextField
                    label="Nombre"
                    value={form.name}
                    onChange={form.handleNameChange}
                    slotProps={{ htmlInput: { maxLength: 31 } }}
                    error={err('LOCATION_NAME')}
                    helperText={
                        <FieldError
                            show={err('LOCATION_NAME')}
                            message={firstError(form.fieldErrors.LOCATION_NAME)}
                        />
                    }
                    fullWidth
                    required
                />

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TimePicker
                            label="Hora de apertura"
                            views={['hours', 'minutes']}
                            format="HH:mm"
                            ampm={false}
                            value={form.opening_hour}
                            onChange={form.handleOpHourChange}
                            timeSteps={{ minutes: 1 }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: true,
                                    error: err('OPENING_HOUR'),
                                    helperText: (
                                        <FieldError
                                            show={err('OPENING_HOUR')}
                                            message={firstError(form.fieldErrors.OPENING_HOUR)}
                                        />
                                    ),
                                },
                            }}
                        />

                        <TimePicker
                            label="Hora de cierre"
                            views={['hours', 'minutes']}
                            format="HH:mm"
                            ampm={false}
                            value={form.closing_hour}
                            onChange={form.handleCloseHourChange}
                            timeSteps={{ minutes: 1 }}
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: true,
                                    error: err('CLOSING_HOUR'),
                                    helperText: (
                                        <FieldError
                                            show={err('CLOSING_HOUR')}
                                            message={firstError(form.fieldErrors.CLOSING_HOUR)}
                                        />
                                    ),
                                },
                            }}
                        />
                    </Stack>
                </LocalizationProvider>

                <Autocomplete
                    options={form.cantons}
                    value={form.cantons.find((canton) => canton.CANTON_NAME === form.canton_name) ?? null}
                    onChange={(_, selected) => form.handleCantonChange(selected)}
                    onBlur={form.handleBlur('CANTON_NAME')}
                    getOptionLabel={(canton) => canton.CANTON_NAME}
                    isOptionEqualToValue={(option, selected) => option.ID_CANTON === selected.ID_CANTON}
                    loading={form.isLoadingCantons}
                    noOptionsText="Sin cantones"
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Cantón"
                            required
                            error={err('CANTON_NAME')}
                            helperText={
                                <FieldError
                                    show={err('CANTON_NAME')}
                                    message={firstError(form.fieldErrors.CANTON_NAME)}
                                />
                            }
                        />
                    )}
                />

                <RequiredFieldsHint />

                {form.saving ? (
                    <Alert severity="info">
                        {form.isCreate ? 'Creando sucursal...' : 'Actualizando sucursal...'}
                    </Alert>
                ) : null}
            </Stack>
        </Box>
    );
}