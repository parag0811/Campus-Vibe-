const User = require("../models/user.js");
const Organisation = require("../models/organisation.js");

const isOrgOwnerOrAdmin = async (req, res, next) => {
  try {
    const { organisationId } = req.params;
    const userId = req.userId;

    const organisation = await Organisation.findById(organisationId);
    if (!organisation) {
      const error = new Error("No organisation found!");
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found!");
      error.statusCode = 404;
      throw error;
    }

    const isOwner = organisation.createdBy.toString() === userId.toString();
    const isOrgAdmin = user.organisation_Admin.includes(organisationId);

    if (isOwner || isOrgAdmin) {
      return next();
    }

    return res.status(403).json({
      message: "Access denied. You are not authorized to perform the action.",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

module.exports = isOrgOwnerOrAdmin;
