const store = require("../store");
const { verifyToken } = require("../utils/crypto");
const { fail } = require("../utils/http");

async function authenticate(req, res, next) {
  try {
    await store.ready;
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const payload = verifyToken(token);

    if (!payload) {
      return fail(res, 401, "Authentication required");
    }

    const user = store.collection("users").find((item) => item.id === payload.sub);
    if (!user) {
      return fail(res, 401, "User no longer exists");
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, 403, "You do not have permission to perform this action");
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
