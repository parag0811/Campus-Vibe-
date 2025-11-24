const jwt = require("jsonwebtoken");

module.exports = function isSiteOwner(req, res, next) {
  const OWNER_EMAIL = process.env.OWNER_EMAIL
    ? String(process.env.OWNER_EMAIL).toLowerCase()
    : null;

  // Prefer values from req.user when present
  let email = req.user?.email || null;
  let role = req.user?.role || null;

  // Fallback: read from JWT cookie (base64url-safe + verified)
  if ((!email || !role) && req.cookies?.token) {
    try {
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
      email = email || decoded.email || decoded.userEmail || null;
      role = role || decoded.userRole || decoded.role || null;
    } catch {
      // ignore decode errors; will handle below
    }
  }

  const emailLc = email ? String(email).toLowerCase() : null;
  const roleLc = role ? String(role).toLowerCase() : null;

  const roleOk = !!roleLc && ["owner", "superadmin", "platformowner"].includes(roleLc);
  const emailOk = !!OWNER_EMAIL && !!emailLc && emailLc === OWNER_EMAIL;

  if (roleOk || emailOk) return next();

  // If we couldn’t read identity at all, treat as unauthorized
  if (!emailLc && !roleLc) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return res.status(403).json({ message: "Forbidden" });
}