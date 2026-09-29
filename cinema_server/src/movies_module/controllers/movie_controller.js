export const getMoviesCount = async (req, res, next) => {
  try {
    // TODO(jesus): make SQL request
    res.status(200).json({ total: 0 });
  } catch (error) {
    next(error);
  }
}

export const getMoviesList = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;
    // TODO(jesus): make SQL request
    res.status(200).json({
      page: Number(page),
      limit: Number(limit),
      data: []
    });
  } catch (error) {
    next(error);
  }
}

export const getMovieByID = async (req, res, next) => {
  try {
    const { id } = req.params;
    // TODO(jesus): make SQL request
    res.status(200).json({
      id,
      title: ''
    });
  } catch (error) {

  }
}
