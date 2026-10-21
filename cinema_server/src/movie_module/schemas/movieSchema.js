import { z } from 'zod';

export const movieQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  genreId: z.coerce.number().int().positive().optional(),
  languageCode: z.string().min(2).max(3).optional(),
  directorId: z.coerce.number().int().positive().optional(),
  audiovisualFormatId: z.coerce.number().int().positive().optional(),
});

export const movieIdSchema = z.object({ id: z.coerce.number().int().positive() });

export const movieBodySchema = z.object({
  MOVIE_TITLE: z.string().trim().min(1).max(100),
  PUBLISHING_YEAR: z.coerce.number().int().min(1888).max(2100),
  SYNOPSIS: z.string().trim().min(1).max(1000),
  MOVIE_DURATION: z.coerce.number().int().positive(),
  POSTER: z.string().trim().min(1).max(500),
  ID_RATING: z.coerce.number().int().positive(),
  GENRE_IDS: z.array(z.coerce.number().int().positive()).optional(),
  DIRECTOR_IDS: z.array(z.coerce.number().int().positive()).optional(),
  FORMAT_IDS: z.array(z.coerce.number().int().positive()).optional(),
  LANGUAGES: z.array(z.object({
    ISO_CODE: z.string().trim().min(2).max(3),
    LANGUAGE_TYPE: z.string().trim().toUpperCase().pipe(z.enum(['OG', 'DUB', 'SUB']))
  })).optional()
});

export const movieBodyPartialSchema = movieBodySchema.partial();