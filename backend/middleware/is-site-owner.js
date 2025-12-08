const jwt = require("jsonwebtoken");

module.exports = function isSiteOwner(req, res, next) {
  const OWNER_EMAIL = process.env.OWNER_EMAIL
    ? String(process.env.OWNER_EMAIL).toLowerCase()
    : null;

  let email = req.user?.email || null;
  let role = req.user?.role || null;

  if ((!email || !role) && req.cookies?.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      email = email || decoded.email || decoded.userEmail || null;
      role = role || decoded.userRole || decoded.role || null;
    } catch {
      // ignore decode errors; will handle below hehe
    }
  }

  const emailLc = email ? String(email).toLowerCase() : null;
  const roleLc = role ? String(role).toLowerCase() : null;
  if (OWNER_EMAIL) {
    if (emailLc === OWNER_EMAIL) return next();
    // If we couldn't read an identity, respond 401; otherwise 403
    if (!emailLc && !roleLc) return res.status(401).json({ message: "Unauthorized" });
    return res.status(403).json({ message: "Forbidden" });
  }

  const roleOk = !!roleLc && ["owner", "superadmin", "platformowner"].includes(roleLc);
  if (roleOk) return next();

  if (!emailLc && !roleLc) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return res.status(403).json({ message: "Forbidden" });
}