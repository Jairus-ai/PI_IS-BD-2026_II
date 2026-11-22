import { z } from 'zod';

export const paymentBodySchema = z.object({
  feeId: z.coerce
    .number({ error: 'La tarifa debe ser un número.' })
    .int('La tarifa no es válida.')
    .positive('La tarifa no es válida.'),
  seatPrice: z.coerce
    .number({ error: 'El precio debe ser un número.' })
    .positive('El precio debe ser mayor a 0.')
    .multipleOf(0.01, 'El precio puede tener como máximo 2 decimales.')
});
