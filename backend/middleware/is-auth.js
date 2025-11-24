const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

module.exports = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    const error = new Error("Please login again.");
    error.statusCode = 401;
    return next(error);
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decodedToken.userId;
    req.userRole = decodedToken.userRole;
    req.profileCompleted = decodedToken.profileCompleted;
    req.userEmail = decodedToken.email

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      err.message = "Session expired. Please log in again!";
      err.statusCode = 401;
    } else {
      err.message = "Invalid token. Please log in again!";
      err.statusCode = 403;
    }

    next(err);
  }
};
