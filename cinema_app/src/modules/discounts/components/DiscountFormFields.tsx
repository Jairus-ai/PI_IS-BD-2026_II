import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { firstError } from '../utils/discountFormUtils';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import type { DiscountForm } from '../hooks/useDiscountForm';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import { DISCOUNT_TYPES } from '../hooks/useDiscountForm';

interface FieldErrorProps {
    readonly show: boolean;
    readonly message: string;
}

interface DiscountFormFieldsProps {
    readonly form: DiscountForm;
    readonly formId: string;
}

function FieldError({ show, message }: FieldErrorProps) {
    return <>{(show && message) || ' '}</>;
}

export default function DiscountFormFields({ form, formId }: DiscountFormFieldsProps) {
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

                <TextField
                    label="Porcentaje del descuento"
                    type="number"
                    value={form.porcentage}
                    onChange={form.handlePorcentageChange}
                    slotProps={{ htmlInput: { maxLength: 4 } }}
                    error={err('DISCOUNT_PORCENTAGE')}
                    helperText={
                        <FieldError
                            show={err('DISCOUNT_PORCENTAGE')}
                            message={firstError(form.fieldErrors.DISCOUNT_PORCENTAGE)}
                        />
                    }
                    fullWidth
                    required
                />

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <DatePicker
                            label="fecha de inicio del descuento"
                            value={form.start_date}
                            onChange={form.handleStartDateChange}
                            format='DD/MM/YYYY'
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: true,
                                    error: err('DISCOUNT_START_DATE'),
                                    helperText: (
                                        <FieldError
                                            show={err('DISCOUNT_START_DATE')}
                                            message={firstError(form.fieldErrors.DISCOUNT_START_DATE)}
                                        />
                                    ),
                                },
                            }}
                        />

                        <DatePicker
                            label="fecha de finalización del descuento"
                            value={form.finish_date}
                            onChange={form.handleFinishDateChange}
                            format='DD/MM/YYYY'
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    required: true,
                                    error: err('DISCOUNT_FINISH_DATE'),
                                    helperText: (
                                        <FieldError
                                            show={err('DISCOUNT_FINISH_DATE')}
                                            message={firstError(form.fieldErrors.DISCOUNT_FINISH_DATE)}
                                        />
                                    ),
                                },
                            }}
                        />
                    </Stack>
                </LocalizationProvider>

                <Box>
                    <Typography variant="body2" sx={{ color: 'primary.dark' }}>
                        Tipo de producto*
                    </Typography>
                    <Stack direction="row" spacing={2}>
                        {DISCOUNT_TYPES.map((type) => (
                            <FormControlLabel
                                key={type}
                                label={type === 'SNACK' ? 'SNACK' : 'PELICULA'}
                                control={
                                    <Checkbox
                                        checked={form.type === type}
                                        onChange={(_, checked) => form.handleTypeChange(checked ? type : null)}
                                        onBlur={form.handleBlur('TYPE')}
                                    />
                                }
                            />
                        ))}
                    </Stack>
                    <FormHelperText error={err('TYPE')}>
                        <FieldError show={err('TYPE')} message={firstError(form.fieldErrors.TYPE)} />
                    </FormHelperText>
                </Box>

                <Autocomplete
                    options={form.products}
                    disabled={form.type == null}
                    value={form.products.find((product) => product.ID_PRODUCT === form.id_prod) ?? null}
                    onChange={(_, selected) => form.handleProductChange(selected)}
                    onBlur={form.handleBlur('ID_FK_PRODUCT')}
                    getOptionLabel={(product) => product.PRODUCT_NAME}
                    isOptionEqualToValue={(option, selected) => option.ID_PRODUCT === selected.ID_PRODUCT}
                    loading={form.isLoadingProducts}
                    noOptionsText="Sin productos"
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Producto del descuento"
                            required
                            error={err('ID_FK_PRODUCT')}
                            helperText={
                                <FieldError
                                    show={err('ID_FK_PRODUCT')}
                                    message={firstError(form.fieldErrors.ID_FK_PRODUCT)}
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