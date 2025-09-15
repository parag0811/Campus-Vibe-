const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.userId || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied. To host an event please contact us." });
    }
    console.log(`User role ${req.userRole} authorized for this action.`);
    next();
  };

};

module.exports = authorizeRole;
