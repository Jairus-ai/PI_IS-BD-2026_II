import oracledb from 'oracledb';

export const getAudiovisualFormatList = async (req, res, next) => {
  let connection;

  try {
    connection = await oracledb.getConnection();

    const sql = `
      SELECT
        avf.id_audiovisual_format,
        vf.video_format_name,
        avf.id_video_format,
        af.audio_format_name,
        avf.id_audio_format
      FROM PI_DEVELOPERS.audiovisual_formats avf
        JOIN PI_DEVELOPERS.video_formats vf ON avf.id_video_format = vf.id_video_format
        JOIN PI_DEVELOPERS.audio_formats af ON avf.id_audio_format = af.id_audio_format
      WHERE avf.IS_DELETED = 0
        AND vf.IS_DELETED = 0
        AND af.IS_DELETED = 0
      ORDER BY vf.VIDEO_FORMAT_NAME ASC, af.AUDIO_FORMAT_NAME ASC
    `;

    const result = await connection.execute(
      sql,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Convert output to JSON
    );

    res.status(200).json({
      data: result.rows
    });

  } catch (error) {
    // TODO(Jesus): manage errors
    next(error);

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error closing connection to the database: ", error);
      }
    }
  }
};