export const getRatingList = async (req, res, next) => {
  try {
    // TODO(jesus): make SQL request
    res.status(200).json({
      data: []
    });
  } catch (error) {
    next(error);
  }
}