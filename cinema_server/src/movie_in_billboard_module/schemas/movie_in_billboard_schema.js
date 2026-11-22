import { z } from 'zod';

const optionalFilterId = (fieldName) =>
  z
    .union([
      z.literal('').transform(() => undefined),
      z.coerce
        .number({ error: `${fieldName} debe ser un número.` })
        .int(`${fieldName} debe ser un número entero.`)
        .positive(`${fieldName} debe ser mayor a 0.`),
    ])
    .optional();

export const movieInBillboardQuerySchema = z.object({
  page: z.coerce
    .number({ error: 'La página debe ser un número.' })
    .int('La página debe ser un número entero.')
    .min(1, 'La página debe ser al menos 1.')
    .default(1),
  locationId: optionalFilterId('El ID de sede'),
  ratingId: optionalFilterId('El ID de clasificación'),
});

export const movieInBillboardIdSchema = z.object({
  id: z.coerce
    .number({ error: 'El ID de la película en cartelera debe ser un número.' })
    .int('El ID de la película en cartelera debe ser un entero.')
    .positive('El ID de la película en cartelera debe ser mayor a 0.'),
});
