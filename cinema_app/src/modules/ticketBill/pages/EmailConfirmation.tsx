import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import useNotifications from '../../../hooks/useNotifications';
import { generateAndSendQR } from '../services/TicketBillingService'
import { useLocation, Navigate, useNavigate } from 'react-router';
import useSession from '../../../hooks/useSession';

interface PurchaseState{
    seatList:number[];
    screeningId: number;
}

interface TicketRequest {
    screeningId: number;
    seatId: number;
}

interface TicketsPayload {
    data: TicketRequest[];
}

function buildTicketsPayload(
    seatList: number[],
    screeningId: number,
): { data: TicketRequest[] } {
    return {
        data: seatList.map((seatId) => ({ screeningId, seatId })),
    };
}

export default function EmailConfirmation()
{
    const notifications = useNotifications();
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as PurchaseState || null;

    if (!state?.seatList?.length) {
        return <Navigate to="/" replace />;
    }

    const { seatList, screeningId } = state;
    const { user } = useSession();
    const userId = user?.id;
    const newSeatList = buildTicketsPayload(seatList,screeningId);

    const seatQR = async (userId: number | null, payload: TicketsPayload) => 
        {
        if (userId === null) 
        {
            return;
        }

        try {
            await generateAndSendQR(userId, payload);
        } catch (error) {
            notifications.show(
                `No se pudo obtener los códigos. Motivo: ${(error as Error).message}`,
                { severity: 'error', autoHideDuration: 3000 },
            );
        }
    };

    void seatQR(userId ?? null, newSeatList);
     return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
                Su compra ha sido procesada
            </Typography>

            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                Se ha enviado a su correo electrónico el/los
                código/s QR de sus boleto/s. Recuerde presentar el código QR al entrar
                a la sala.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <Button
                    variant="contained"
                    size="large"
                    disableElevation
                    onClick={() => navigate('/')}
                >
                    Volver al inicio
                </Button>
            </Box>
        </Box>
    );
};