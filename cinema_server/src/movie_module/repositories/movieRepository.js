import oracledb from 'oracledb';

const MOVIE_BODY_FIELDS = [
  'MOVIE_TITLE',
  'PUBLISHING_YEAR',
  'SYNOPSIS',
  'MOVIE_DURATION',
  'POSTER',
  'ID_RATING'
];

export async function rollback(connection) {
  if (!connection) return;
  try {
    await connection.rollback();
  } catch (rollbackError) {
    console.error('Error doing rollback:', rollbackError);
  }
}

// Functions for visualize movies
export function buildMovieFilters(queryParams) {
  const { genreId, languageCode, directorId, audiovisualFormatId } = queryParams;
  const conditions = ['m.IS_DELETED = 0'];
  const binds = {};

  if (genreId) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM PI_DEVELOPERS.movies_genres mg
        WHERE mg.id_movie = m.id_movie AND mg.id_genre = :genreId
      )
    `);
    binds.genreId = Number(genreId);
  }

  if (languageCode) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM PI_DEVELOPERS.movies_languages ml
        WHERE ml.id_movie = m.id_movie AND ml.iso_code = :languageCode
      )
    `);
    binds.languageCode = String(languageCode);
  }

  if (directorId) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM PI_DEVELOPERS.movies_directors md
        WHERE md.id_movie = m.id_movie AND md.id_director = :directorId
      )
    `);
    binds.directorId = Number(directorId);
  }

  if (audiovisualFormatId) {
    conditions.push(`
      EXISTS (
        SELECT 1 FROM PI_DEVELOPERS.movies_formats mf
        WHERE mf.id_movie = m.id_movie AND mf.id_audiovisual_format = :audiovisualFormatId
      )
    `);
    binds.audiovisualFormatId = Number(audiovisualFormatId);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  return { whereClause, binds };
}

export function splitMovieBody(validatedBody) {
  const movie = {};
  const relations = {};
  for (const key of Object.keys(validatedBody ?? {})) {
    if (MOVIE_BODY_FIELDS.includes(key)) movie[key] = validatedBody[key];
    else relations[key] = validatedBody[key];
  }
  return { movie, relations };
}

export async function countMovies(connection, queryParams) {
  const { whereClause, binds } = buildMovieFilters(queryParams);

  const sql = `
    SELECT COUNT(m.id_movie) AS TOTAL
    FROM PI_DEVELOPERS.movies m
    ${whereClause}
  `;

  const result = await connection.execute(
    sql,
    binds,
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0].TOTAL;
}

export async function listMovies(connection, queryParams, page) {
  const limit = 10;
  const offset = (page - 1) * limit;
  const { whereClause, binds } = buildMovieFilters(queryParams);

  const sql = `
    SELECT
      m.id_movie,
      m.movie_title,
      m.publishing_year,
      m.poster,
      LISTAGG(g.genre_name, ', ') WITHIN GROUP (ORDER BY g.genre_name) AS genres
    FROM PI_DEVELOPERS.movies m
    LEFT JOIN PI_DEVELOPERS.movies_genres mg ON m.id_movie = mg.id_movie
    LEFT JOIN PI_DEVELOPERS.genres g ON mg.id_genre = g.id_genre
    ${whereClause}
    GROUP BY m.id_movie, m.movie_title, m.publishing_year, m.poster
    ORDER BY m.movie_title ASC, m.publishing_year ASC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;

  const result = await connection.execute(
    sql,
    { ...binds, offset, limit },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return { page, limit, rows: result.rows };
}

export async function findMovieById(connection, id) {
  const sql = `
    SELECT
      m.id_movie,
      m.movie_title,
      m.synopsis,
      m.movie_duration,
      m.publishing_year,
      m.poster,
      r.rating_name,
      r.rating_code,
      LISTAGG(DISTINCT g.genre_name, ', ')
        WITHIN GROUP (ORDER BY g.genre_name) AS genres,
      LISTAGG(DISTINCT d.director_first_name || ' ' || d.director_last_name, ', ')
        WITHIN GROUP (ORDER BY d.director_last_name) AS directors,
      LISTAGG(DISTINCT vf.video_format_name || ' ' || af.audio_format_name, ', ')
        WITHIN GROUP (ORDER BY vf.video_format_name) AS formats,
      LISTAGG(DISTINCT l.language_name || ' [' || ml.language_type || ']', ', ')
        WITHIN GROUP (ORDER BY l.language_name) AS languages
    FROM PI_DEVELOPERS.movies m
      LEFT JOIN PI_DEVELOPERS.ratings r ON m.id_rating = r.id_rating
      LEFT JOIN PI_DEVELOPERS.movies_genres mg ON m.id_movie = mg.id_movie
      LEFT JOIN PI_DEVELOPERS.genres g ON mg.id_genre = g.id_genre
      LEFT JOIN PI_DEVELOPERS.movies_directors md ON m.id_movie = md.id_movie
      LEFT JOIN PI_DEVELOPERS.directors d ON md.id_director = d.id_director
      LEFT JOIN PI_DEVELOPERS.movies_formats mf ON m.id_movie = mf.id_movie
      LEFT JOIN PI_DEVELOPERS.audiovisual_formats avf ON mf.id_audiovisual_format = avf.id_audiovisual_format
      LEFT JOIN PI_DEVELOPERS.video_formats vf ON avf.id_video_format = vf.id_video_format
      LEFT JOIN PI_DEVELOPERS.audio_formats af ON avf.id_audio_format = af.id_audio_format
      LEFT JOIN PI_DEVELOPERS.movies_languages ml ON m.id_movie = ml.id_movie
      LEFT JOIN PI_DEVELOPERS.languages l ON ml.iso_code = l.iso_code
    WHERE m.id_movie = :id
      AND m.is_deleted = 0
    GROUP BY
      m.id_movie,
      m.movie_title,
      m.synopsis,
      m.movie_duration,
      m.publishing_year,
      m.poster,
      r.rating_name,
      r.rating_code
  `;

  const result = await connection.execute(
    sql,
    { id: Number(id) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  return result.rows[0] ?? null;
}

// Functions for create movie
export async function insertMovie(connection, movie) {
  const result = await connection.execute(
    `INSERT INTO PI_DEVELOPERS.movies
      (MOVIE_TITLE, PUBLISHING_YEAR, SYNOPSIS, MOVIE_DURATION, POSTER, ID_RATING)
      VALUES (:movietitle, :publishingyear, :synopsis, :movieduration, :poster, :idrating)
      RETURNING ID_MOVIE INTO :idmovie`,
    {
      movietitle: movie.MOVIE_TITLE,
      publishingyear: movie.PUBLISHING_YEAR,
      synopsis: movie.SYNOPSIS,
      movieduration: movie.MOVIE_DURATION,
      poster: movie.POSTER,
      idrating: movie.ID_RATING,
      idmovie: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    }
  );

  return result.outBinds.idmovie[0];
}

async function insertMovieGenres(connection, idMovie, ids) {
  for (const idGenre of ids) {
    await connection.execute(
      `INSERT INTO PI_DEVELOPERS.movies_genres
        (ID_MOVIE, ID_GENRE)
        VALUES (:idmovie, :idgenre)`,
      { idmovie: idMovie, idgenre: idGenre }
    );
  }
}

async function insertMovieDirectors(connection, idMovie, ids) {
  for (const idDirector of ids) {
    await connection.execute(
      `INSERT INTO PI_DEVELOPERS.movies_directors
        (ID_MOVIE, ID_DIRECTOR)
        VALUES (:idmovie, :iddirector)`,
      { idmovie: idMovie, iddirector: idDirector }
    );
  }
}

async function insertMovieFormats(connection, idMovie, ids) {
  for (const idFormat of ids) {
    await connection.execute(
      `INSERT INTO PI_DEVELOPERS.movies_formats
        (ID_MOVIE, ID_AUDIOVISUAL_FORMAT)
        VALUES (:idmovie, :idformat)`,
      { idmovie: idMovie, idformat: idFormat }
    );
  }
}

async function insertMovieLanguages(connection, idMovie, languages) {
  for (const lang of languages) {
    await connection.execute(
      `INSERT INTO PI_DEVELOPERS.movies_languages
        (LANGUAGE_TYPE, ID_MOVIE, ISO_CODE)
        VALUES (:languagetype, :idmovie, :isocode)`,
      { languagetype: lang.LANGUAGE_TYPE, idmovie: idMovie, isocode: lang.ISO_CODE }
    );
  }
}

export async function insertMovieRelations(connection, idMovie, relations) {
  await insertMovieGenres(connection, idMovie, relations.GENRE_IDS ?? []);
  await insertMovieDirectors(connection, idMovie, relations.DIRECTOR_IDS ?? []);
  await insertMovieFormats(connection, idMovie, relations.FORMAT_IDS ?? []);
  await insertMovieLanguages(connection, idMovie, relations.LANGUAGES ?? []);
}

export async function createMovieWithRelations(connection, movie, relations) {
  const idMovie = await insertMovie(connection, movie);
  await insertMovieRelations(connection, idMovie, relations);
  await connection.commit();
  return idMovie;
}

// Functions for update movie
async function replaceMovieGenres(connection, idMovie, ids) {
  await connection.execute(
    `DELETE FROM PI_DEVELOPERS.movies_genres
      WHERE ID_MOVIE = :idmovie`,
    { idmovie: idMovie }
  );
  await insertMovieGenres(connection, idMovie, ids);
}

async function replaceMovieDirectors(connection, idMovie, ids) {
  await connection.execute(
    `DELETE FROM PI_DEVELOPERS.movies_directors
      WHERE ID_MOVIE = :idmovie`,
    { idmovie: idMovie }
  );
  await insertMovieDirectors(connection, idMovie, ids);
}

async function replaceMovieFormats(connection, idMovie, ids) {
  await connection.execute(
    `DELETE FROM PI_DEVELOPERS.movies_formats
      WHERE ID_MOVIE = :idmovie`,
    { idmovie: idMovie }
  );
  await insertMovieFormats(connection, idMovie, ids);
}

async function replaceMovieLanguages(connection, idMovie, languages) {
  await connection.execute(
    `DELETE FROM PI_DEVELOPERS.movies_languages
      WHERE ID_MOVIE = :idmovie`,
    { idmovie: idMovie }
  );
  await insertMovieLanguages(connection, idMovie, languages);
}

export async function movieExists(connection, id) {
  const check = await connection.execute(
    `SELECT 1
      FROM PI_DEVELOPERS.movies
      WHERE ID_MOVIE = :id
        AND IS_DELETED = 0`,
    { id: Number(id) },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  return check.rows.length > 0;
}

export async function updateMovieBase(connection, id, movie) {
  const fields = Object.keys(movie).filter((key) => MOVIE_BODY_FIELDS.includes(key));
  if (fields.length === 0) return null;

  const setClause = fields.map((field) => `${field} = :${field.toLowerCase()}`).join(', ');
  const binds = { id: Number(id) };

  for (const field of fields) {
    binds[field.toLowerCase()] = movie[field];
  }

  const result = await connection.execute(
    `UPDATE PI_DEVELOPERS.movies
      SET ${setClause}
      WHERE ID_MOVIE = :id AND IS_DELETED = 0`,
    binds
  );

  return result.rowsAffected;
}

export async function replaceMovieRelations(connection, idMovie, relations) {
  if ('GENRE_IDS' in relations) await replaceMovieGenres(connection, idMovie, relations.GENRE_IDS);
  if ('DIRECTOR_IDS' in relations) await replaceMovieDirectors(connection, idMovie, relations.DIRECTOR_IDS);
  if ('FORMAT_IDS' in relations) await replaceMovieFormats(connection, idMovie, relations.FORMAT_IDS);
  if ('LANGUAGES' in relations) await replaceMovieLanguages(connection, idMovie, relations.LANGUAGES);
}

export async function updateMovieWithRelations(connection, id, movie, relations) {
  const idMovie = Number(id);
  const fields = Object.keys(movie).filter((key) => MOVIE_BODY_FIELDS.includes(key));
  const hasRelations = Object.keys(relations).length > 0;
  if (fields.length === 0 && !hasRelations) return 'empty';

  if (fields.length > 0) {
    const rowsAffected = await updateMovieBase(connection, idMovie, movie);
    if (rowsAffected === 0) {
      await rollback(connection);
      return 'not-found';
    }
  } else if (!(await movieExists(connection, idMovie))) {
    await rollback(connection);
    return 'not-found';
  }

  await replaceMovieRelations(connection, idMovie, relations);
  await connection.commit();
  return 'ok';
}

// Function for delete movie
export async function softDeleteMovie(connection, id) {
  const result = await connection.execute(
    `UPDATE PI_DEVELOPERS.movies
      SET IS_DELETED = 1
      WHERE ID_MOVIE = :id
        AND IS_DELETED = 0`,
    { id: Number(id) },
    { autoCommit: true }
  );

  return result.rowsAffected;
}
