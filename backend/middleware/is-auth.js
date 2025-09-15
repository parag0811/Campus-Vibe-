const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    // Do NOT throw; instead, call next(err)
    const error = new Error("We cannot login for a moment. Try again later.");
    error.statusCode = 401;
    return next(error);
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    err.message = "Session expired. Please log in again!";
    err.statusCode = 403;
    return next(err);
  }
  if (!decodedToken) {
    const error = new Error("Access denied. Try again later.");
    error.statusCode = 401;
    return next(error);
  }

  req.userId = decodedToken.userId;
  req.userRole = decodedToken.userRole;
  req.profileCompleted = decodedToken.profileCompleted;
  next();
};
