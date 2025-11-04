const User = require("../models/user.js");

const checkProfileCompleted = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.userId)
      .select("profileCompleted")
      .lean();

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!user.profileCompleted) {
      return res.status(403).json({
        success: false,
        code: "PROFILE_INCOMPLETE",
        message: "Please complete your profile to register for events.",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = checkProfileCompleted;