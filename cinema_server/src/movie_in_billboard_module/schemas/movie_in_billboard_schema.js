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

const optionalMovieName = z
  .string()
  .trim()
  .max(100, 'El nombre de la película no puede exceder los 100 caracteres.')
  .transform((value) =>
    value === ''
      ? undefined
      : value
  )
  .optional();

export const movieInBillboardQuerySchema = z.object({
  page: z.coerce
    .number({ error: 'La página debe ser un número.' })
    .int('La página debe ser un número entero.')
    .min(1, 'La página debe ser al menos 1.')
    .default(1),
  locationId: optionalFilterId('El ID de sede'),
  ratingId: optionalFilterId('El ID de clasificación'),
  movieName: optionalMovieName,
});

export const movieInBillboardIdSchema = z.object({
  id: z.coerce
    .number({ error: 'El ID de la película en cartelera debe ser un número.' })
    .int('El ID de la película en cartelera debe ser un entero.')
    .positive('El ID de la película en cartelera debe ser mayor a 0.'),
});

const requiredId = (fieldName) =>
  z.coerce
    .number({ error: `${fieldName} debe ser un número.` })
    .int(`${fieldName} debe ser un número entero.`)
    .positive(`${fieldName} debe ser mayor a 0.`);

const requiredDate = (fieldName) =>
  z.iso.date({ error: `${fieldName} debe ser una fecha válida con formato AAAA-MM-DD.` });

export const movieInBillboardBodySchema = z
  .object({
    movieId: requiredId('El ID de la película'),
    locationId: requiredId('El ID de sede'),
    openingDate: requiredDate('La fecha de inicio'),
    closingDate: requiredDate('La fecha de fin'),
    premier: z
      .boolean({ error: 'El estreno debe ser verdadero o falso.' })
      .default(false),
  })
  .refine((movieInBillboard) => movieInBillboard.closingDate >= movieInBillboard.openingDate, {
    path: ['closingDate'],
    error: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
  });
