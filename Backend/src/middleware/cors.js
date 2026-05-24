const cors = require("cors");
const config = require("../config");

const corsMiddleware = cors({
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes("*") || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
});

module.exports = corsMiddleware;
