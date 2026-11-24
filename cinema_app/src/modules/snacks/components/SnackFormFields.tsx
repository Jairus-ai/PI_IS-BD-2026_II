import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { firstError } from '../utils/snackFormUtils';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import type { SnackForm } from '../hooks/useSnacksForm';

interface FieldErrorProps {
    readonly show: boolean;
    readonly message: string;
}

interface SnackFormFieldsProps {
    readonly form: SnackForm;
    readonly formId: string;
}

function FieldError({ show, message }: FieldErrorProps) {
    return <>{(show && message) || ' '}</>;
}

export default function SnackFormField({ form, formId }: SnackFormFieldsProps) {
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
                    slotProps={{ htmlInput: { maxLength: 51 } }}
                    error={err('SNACK_NAME')}
                    helperText={
                        <FieldError
                            show={err('SNACK_NAME')}
                            message={firstError(form.fieldErrors.SNACK_NAME)}
                        />
                    }
                    fullWidth
                    required
                />

                <TextField
                    label="Descripción"
                    value={form.description}
                    onChange={form.handleDescriptionChange}
                    slotProps={{ htmlInput: { maxLength: 101 } }}
                    error={err('SNACK_DESCRIPTION')}
                    helperText={
                        <FieldError
                            show={err('SNACK_DESCRIPTION')}
                            message={firstError(form.fieldErrors.SNACK_DESCRIPTION)}
                        />
                    }
                    fullWidth
                    required
                />

                <TextField
                    label="Precio del snack"
                    type="number"
                    value={form.price}
                    onChange={form.handlePriceChange}
                    slotProps={{ htmlInput: { maxLength: 4 } }}
                    error={err('PRICE')}
                    helperText={
                        <FieldError
                            show={err('PRICE')}
                            message={firstError(form.fieldErrors.PRICE)}
                        />
                    }
                    fullWidth
                    required
                />

                <RequiredFieldsHint />
            </Stack>
        </Box>
    );
}