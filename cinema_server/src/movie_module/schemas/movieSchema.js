import { z } from 'zod';

const emptyToUndefined = z.literal('').transform(() => undefined);

const optionalCoerceNumber = (fieldName) =>
  z
    .union([
      emptyToUndefined,
      z.coerce
        .number({ invalid_type_error: `${fieldName} debe ser un número.` })
        .int(`${fieldName} debe ser un número entero.`)
        .positive(`${fieldName} debe ser mayor a 0.`),
    ])
    .optional();

const optionalCoerceString = z
  .union([
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(1, 'El filtro no puede estar vacío.')
      .max(100, 'El filtro no puede exceder los 100 caracteres.'),
  ])
  .optional();

export const movieQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'La página debe ser un número.' })
    .int('La página debe ser un número entero.')
    .min(1, 'La página debe ser al menos 1.')
    .default(1),
  genreId: optionalCoerceNumber('El ID de género'),
  languageCode: optionalCoerceString,
  directorId: optionalCoerceNumber('El ID de director'),
  audiovisualFormatId: optionalCoerceNumber('El ID de formato audiovisual'),
});

export const movieIdSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'El ID de la película debe ser un número.' })
    .int('El ID de la película debe ser un entero.')
    .positive('El ID de la película debe ser un entero mayor a 0.'),
});

export const movieBodySchema = z.object({
  MOVIE_TITLE: z
    .string({ required_error: 'El título es obligatorio.' })
    .trim()
    .min(1, 'El título no puede estar vacío.')
    .max(100, 'El título no puede exceder los 100 caracteres.'),
  PUBLISHING_YEAR: z.coerce
    .number({
      required_error: 'El año de publicación es obligatorio.',
      invalid_type_error: 'El año debe ser un número.',
    })
    .int('El año debe ser un número entero.')
    .min(1888, 'El año debe ser 1888 o posterior a este año.')
    .max(2026, 'El año no puede ser superior a 2026.'),
  SYNOPSIS: z
    .string({ required_error: 'La sinopsis es obligatoria.' })
    .trim()
    .min(1, 'La sinopsis no puede estar vacía.')
    .max(1000, 'La sinopsis no puede exceder los 1000 caracteres.'),
  MOVIE_DURATION: z.coerce
    .number({
      required_error: 'La duración es obligatoria.',
      invalid_type_error: 'La duración debe ser un número.',
    })
    .int('La duración debe ser expresada en minutos enteros.')
    .positive('La duración debe ser mayor a 0 minutos.'),
  POSTER: z
    .string({ required_error: 'La ruta del póster es obligatoria.' })
    .trim()
    .min(1, 'La ruta del póster no puede estar vacía.')
    .max(500, 'La ruta del póster no puede exceder los 500 caracteres.'),
  ID_RATING: z.coerce
    .number({
      required_error: 'La clasificación es obligatoria.',
      invalid_type_error: 'El ID de clasificación debe ser un número.',
    })
    .int('El ID de clasificación debe ser un número entero.')
    .positive('El ID de clasificación debe ser mayor a 0.'),
  GENRE_IDS: z
    .array(
      z.coerce
        .number({ invalid_type_error: 'El ID de género debe ser un número.' })
        .int('El ID de género debe ser entero.')
        .positive('El ID de género debe ser mayor a 0.')
    )
    .optional(),
  DIRECTOR_IDS: z
    .array(
      z.coerce
        .number({ invalid_type_error: 'El ID de director debe ser un número.' })
        .int('El ID de director debe ser entero.')
        .positive('El ID de director debe ser mayor a 0.')
    )
    .optional(),
  FORMAT_IDS: z
    .array(
      z.coerce
        .number({ invalid_type_error: 'El ID de formato debe ser un número.' })
        .int('El ID de formato debe ser entero.')
        .positive('El ID de formato debe ser mayor a 0.')
    )
    .optional(),
  LANGUAGES: z
    .array(
      z.object({
        ISO_CODE: z
          .string({ required_error: 'El código ISO es obligatorio.' })
          .trim()
          .length(3, 'El código ISO del idioma debe tener exactamente 3 caracteres (ej. SPA, ENG).'),
        LANGUAGE_TYPE: z
          .string({ required_error: 'El tipo de idioma es obligatorio.' })
          .trim()
          .toUpperCase()
          .pipe(
            z.enum(['OG', 'DUB', 'SUB'], {
              errorMap: () => ({
                message: 'El tipo de idioma debe ser OG (Original), DUB (Doblado) o SUB (Subtitulado).',
              }),
            })
          ),
      })
    )
    .optional(),
});

export const movieBodyPartialSchema = movieBodySchema.partial();