const cors = require("cors");
const config = require("../config");

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes("*")) {
      return callback(null, true);
    }

    const requestDomain = origin.replace(/^https?:\/\//, "").replace(/\/$/, "");
    
    const isAllowed = config.corsOrigins.some((allowed) => {
      const allowedDomain = allowed.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return requestDomain === allowedDomain;
    });

    if (isAllowed) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
});

module.exports = corsMiddleware;
