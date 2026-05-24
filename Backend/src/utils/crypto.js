const crypto = require("crypto");
const config = require("../config");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlJson(value) {
  return base64url(JSON.stringify(value));
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: now + config.tokenTtlSeconds
  };
  const unsigned = `${base64urlJson(header)}.${base64urlJson(body)}`;
  const signature = crypto
    .createHmac("sha256", config.jwtSecret)
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  const expected = crypto
    .createHmac("sha256", config.jwtSecret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  const payload = JSON.parse(fromBase64url(body));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const candidate = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
  const left = Buffer.from(candidate, "hex");
  const right = Buffer.from(hash, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = { signToken, verifyToken, hashPassword, verifyPassword };
