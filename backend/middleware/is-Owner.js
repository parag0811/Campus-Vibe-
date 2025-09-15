const User = require("../models/user.js");

const isOwner = async (req, res, next) => {
  const paramUserId = req.params.userId;
  const loggedInUserId = req.userId;

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("No user found!");
      error.statusCode = 404;
      throw error;
    }
    if (!paramUserId || !loggedInUserId) {
      const error = new Error("Missing user identification.");
      error.statusCode = 400;
      throw error;
    }

    if (paramUserId.toString() !== loggedInUserId.toString()) {
      const error = new Error(
        "Access denied. You can only manipulate your own data."
      );
      error.statusCode = 403;
      throw error;
    }
    next();
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

module.exports = isOwner;
