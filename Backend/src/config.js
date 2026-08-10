require("dotenv").config();

function parseOrigins(value) {
  if (!value || value === "*") return ["*"];
  return value.split(",").map((origin) => origin.trim().replace(/\/$/, "")).filter(Boolean);
}

const config = {
  env: (process.env.NODE_ENV || "development").trim(),
  port: Number(process.env.PORT || 3000),
  jwtSecret: (process.env.JWT_SECRET || "change-this-secret-in-production").trim(),
  tokenTtlSeconds: Number(process.env.JWT_TTL_SECONDS || 60 * 60 * 24),
  aiProvider: (process.env.AI_PROVIDER || "gemini").toLowerCase().trim(),
  storageDriver: (process.env.STORAGE_DRIVER || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? "supabase" : "file")).trim(),
  dataFile: (process.env.DATA_FILE || "data/store.json").trim(),
  supabaseUrl: (process.env.SUPABASE_URL || "").trim(),
  supabaseServiceKey: (process.env.SUPABASE_SERVICE_KEY || "").trim(),
  openaiApiKey: (process.env.OPENAI_API_KEY || "").trim(),
  openaiModel: (process.env.OPENAI_MODEL || "gpt-4o-mini").trim(),
  geminiApiKey: (process.env.GEMINI_API_KEY || "").trim(),
  geminiModel: (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim(),
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN || "*"),
  bodyLimit: (process.env.BODY_LIMIT || "1mb").trim(),
  adminEmail: (process.env.ADMIN_EMAIL || "admin@example.com").trim(),
  adminPassword: (process.env.ADMIN_PASSWORD || "admin12345").trim(),
  trustProxy: process.env.TRUST_PROXY === "true",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 300)
};

config.isProduction = config.env === "production";

function validateProductionConfig() {
  if (!config.isProduction) return;

  const errors = [];
  if (!process.env.JWT_SECRET || config.jwtSecret.length < 32) {
    errors.push("JWT_SECRET must be set to at least 32 characters");
  }
  if (!process.env.ADMIN_EMAIL) {
    errors.push("ADMIN_EMAIL must be set");
  }
  if (!process.env.ADMIN_PASSWORD || config.adminPassword.length < 12) {
    errors.push("ADMIN_PASSWORD must be set to at least 12 characters");
  }
  if (config.corsOrigins.includes("*")) {
    errors.push("CORS_ORIGIN must be set to your frontend origin in production");
  }
  if (config.storageDriver !== "supabase") {
    errors.push("STORAGE_DRIVER must be supabase in production");
  }
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    errors.push("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in production");
  }
  if (!["openai", "gemini"].includes(config.aiProvider)) {
    errors.push("AI_PROVIDER must be either openai or gemini");
  }
  if (config.aiProvider === "openai" && !process.env.OPENAI_API_KEY) {
    errors.push("OPENAI_API_KEY must be set when AI_PROVIDER=openai");
  }
  if (config.aiProvider === "gemini" && !process.env.GEMINI_API_KEY) {
    errors.push("GEMINI_API_KEY must be set when AI_PROVIDER=gemini");
  }

  if (errors.length) {
    throw new Error(`Invalid production configuration: ${errors.join("; ")}`);
  }
}

validateProductionConfig();

module.exports = config;
