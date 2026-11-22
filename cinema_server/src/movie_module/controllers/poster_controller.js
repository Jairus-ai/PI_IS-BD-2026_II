export const uploadPosterFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Póster no encontrado' });
    }

    const posterPath = `/posters/${req.file.filename}`;
    console.log(`Poster stored: ${posterPath}`);

    res.status(201).json({ data: { poster: posterPath } });
  } catch (error) {
    next(error);
  }
};
