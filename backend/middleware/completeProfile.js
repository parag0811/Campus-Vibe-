const checkProfileCompleted = (req, res, next) => {
  const allowedRoutes = ['/profile', '/auth/logout', '/auth/user-profile'];
  if (!req.user.profileCompleted && !allowedRoutes.includes(req.path)) {
    return res.status(403).json({
      message: "Complete your profile before accessing this page.",
      redirect: "/profile"
    });
  }
  next();
};

module.exports = checkProfileCompleted