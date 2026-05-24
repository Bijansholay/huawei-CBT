const express = require("express");
const helmet = require("helmet");
const config = require("./config");
const store = require("./store");
const { fail, ok } = require("./utils/http");
const corsMiddleware = require("./middleware/cors");
const rateLimit = require("./middleware/rateLimit");
const requestId = require("./middleware/requestId");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const examRoutes = require("./routes/exams");
const studentRoutes = require("./routes/student");
const pdfRoutes = require("./routes/pdf");
const questionRoutes = require("./routes/questions");

const app = express();

if (config.trustProxy) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(requestId);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(corsMiddleware);
app.use(rateLimit);
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true }));
app.use(async (req, res, next) => {
  try {
    await store.ready;
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/", (req, res) => ok(res, { service: "Huawei CBT Backend", status: "running" }));
app.get("/api/health", (req, res) => ok(res, { status: "ok" }));
app.get("/api/ready", (req, res) => {
  return ok(res, {
    status: "ready",
    env: config.env,
    storage: config.storageDriver
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/questions", questionRoutes);

app.use((req, res) => fail(res, 404, "Route not found"));

app.use((err, req, res, next) => {
  const status = err.message === "Origin not allowed by CORS" ? 403 : 500;
  console.error({
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    error: err.message,
    stack: config.isProduction ? undefined : err.stack
  });
  return fail(res, status, status === 403 ? err.message : "Internal server error");
});

module.exports = app;
