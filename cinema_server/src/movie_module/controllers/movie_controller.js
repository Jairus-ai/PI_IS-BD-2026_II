import oracledb from 'oracledb';

const buildMovieFilters = (queryParams) => {
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
};

export const getMoviesCount = async (req, res, next) => {
  console.log("getMoviesCount is being called");

  let connection;

  try {
    connection = await oracledb.getConnection();

    const { whereClause, binds } = buildMovieFilters(req.query);

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

    res.status(200).json({
      total: result.rows[0].TOTAL
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error closing connection:", error);
      }
    }
  }
};

export const getMoviesList = async (req, res, next) => {
  console.log("getMoviesList is being called");

  let connection;

  try {
    const page = Number(req.query.page);
    const limit = 10;
    const offset = (page - 1) * limit;

    connection = await oracledb.getConnection();

    const { whereClause, binds } = buildMovieFilters(req.query);

    const allBinds = {
      ...binds,
      offset,
      limit
    };

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
      allBinds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    res.status(200).json({
      page,
      limit,
      data: result.rows
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error closing connection:", error);
      }
    }
  }
};

export const getMovieByID = async (req, res, next) => {
  console.log("getMovieByID is being called");

  let connection;

  try {
    const { id } = req.params;

    connection = await oracledb.getConnection();

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

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Movie not found'
      });
    }

    res.status(200).json({
      data: result.rows[0]
    });

  } catch (error) {
    next(error);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error closing connection:", error);
      }
    }
  }
};
