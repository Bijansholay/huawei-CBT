const express = require("express");
const store = require("../store");
const { authenticate } = require("../middleware/auth");
const { signToken, hashPassword, verifyPassword } = require("../utils/crypto");
const { ok, created, fail, asyncHandler } = require("../utils/http");

const router = express.Router();

function issueAuth(res, user, message = "Login successful") {
  const safeUser = store.withoutSecrets(user);
  const token = signToken({ sub: user.id, role: user.role });
  return ok(res, { user: safeUser, token }, message);
}

router.post("/register", asyncHandler(async (req, res) => {
  const { matricNumber, matric_number, surname, email, password } = req.body;
  const matric = String(matricNumber || matric_number || "").trim();
  const cleanSurname = String(surname || "").trim();

  if (!matric || !cleanSurname) {
    return fail(res, 400, "matricNumber and surname are required");
  }

  const exists = store.collection("users").some((user) => user.matricNumber === matric);
  if (exists) {
    return fail(res, 409, "A student with this matric number already exists");
  }

  const user = await store.insert("users", {
    matricNumber: matric,
    matric_number: matric,
    surname: cleanSurname,
    email: email ? String(email).toLowerCase() : null,
    passwordHash: password ? hashPassword(password) : null,
    role: "student"
  });

  return created(res, { user: store.withoutSecrets(user) }, "Registration successful");
}));

router.post("/login", (req, res) => {
  const { matricNumber, matric_number, surname, email, password } = req.body;
  const matric = String(matricNumber || matric_number || "").trim();

  if (matric) {
    const user = store.collection("users").find((item) => {
      return item.role === "student" &&
        item.matricNumber === matric &&
        item.surname.toLowerCase() === String(surname || "").trim().toLowerCase();
    });

    if (!user) return fail(res, 401, "Invalid matric number or surname");
    return issueAuth(res, user);
  }

  const user = store.collection("users").find((item) => {
    return item.email && item.email === String(email || "").trim().toLowerCase();
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail(res, 401, "Invalid email or password");
  }

  return issueAuth(res, user);
});

router.post("/logout", authenticate, (req, res) => {
  return ok(res, null, "Logout successful");
});

router.get("/me", authenticate, (req, res) => {
  return ok(res, { user: store.withoutSecrets(req.user) });
});

module.exports = router;
