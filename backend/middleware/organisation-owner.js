const Organisation = require("../models/organisation.js");

const isOrgOwner = async (req, res, next) => {
  try {
    const userId = req.userId;

    const organisation = await Organisation.findOne({ createdBy: userId });

    if (!organisation) {
      return res.status(403).json({
        message: "Access denied. You do not own any organisation.",
      });
    }

    if (organisation.createdBy.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only the org owner can do this." });
    }
    next();
  } catch (err) {
    if (!err.statusCode) err.statusCode = 500;
    next(err);
  }
};

module.exports = isOrgOwner;
