const express = require("express");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { hashPassword } = require("../utils/crypto");
const { ok, created, fail, asyncHandler } = require("../utils/http");

const router = express.Router();
router.use(authenticate, requireRole("admin"));

router.get("/students", (req, res) => {
  const students = store.collection("users")
    .filter((user) => user.role === "student")
    .map(store.withoutSecrets);
  return ok(res, { students });
});

router.get("/admins", (req, res) => {
  const admins = store.collection("users")
    .filter((user) => user.role === "admin")
    .map(store.withoutSecrets);
  return ok(res, { admins });
});

router.post("/admins", asyncHandler(async (req, res) => {
  const { email, password, surname, name } = req.body;
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return fail(res, 400, "email and password are required");
  }
  if (String(password).length < 8) {
    return fail(res, 400, "password must be at least 8 characters");
  }

  const exists = store.collection("users").some((user) => user.email === cleanEmail);
  if (exists) return fail(res, 409, "A user with this email already exists");

  const admin = await store.insert("users", {
    matricNumber: null,
    matric_number: null,
    surname: surname || name || "Admin",
    email: cleanEmail,
    passwordHash: hashPassword(password),
    role: "admin"
  });

  return created(res, { admin: store.withoutSecrets(admin) }, "Admin created");
}));

router.put("/admins/:id", asyncHandler(async (req, res) => {
  const admin = store.collection("users").find((user) => user.id === req.params.id && user.role === "admin");
  if (!admin) return fail(res, 404, "Admin not found");

  const patch = {};
  if (req.body.email !== undefined) {
    const cleanEmail = String(req.body.email || "").trim().toLowerCase();
    if (!cleanEmail) return fail(res, 400, "email cannot be empty");

    const exists = store.collection("users").some((user) => user.id !== admin.id && user.email === cleanEmail);
    if (exists) return fail(res, 409, "A user with this email already exists");
    patch.email = cleanEmail;
  }
  if (req.body.surname || req.body.name) patch.surname = String(req.body.surname || req.body.name).trim();
  if (req.body.password) {
    if (String(req.body.password).length < 8) return fail(res, 400, "password must be at least 8 characters");
    patch.passwordHash = hashPassword(req.body.password);
  }

  const updated = await store.update("users", req.params.id, patch);
  return ok(res, { admin: store.withoutSecrets(updated) }, "Admin updated");
}));

router.delete("/admins/:id", asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    return fail(res, 400, "You cannot delete your own admin account");
  }

  const admin = store.collection("users").find((user) => user.id === req.params.id && user.role === "admin");
  if (!admin) return fail(res, 404, "Admin not found");

  const adminCount = store.collection("users").filter((user) => user.role === "admin").length;
  if (adminCount <= 1) return fail(res, 400, "At least one admin account is required");

  await store.remove("users", req.params.id);
  return ok(res, null, "Admin deleted");
}));

router.post("/students", asyncHandler(async (req, res) => {
  const { matricNumber, matric_number, surname, email, password } = req.body;
  const matric = String(matricNumber || matric_number || "").trim();
  if (!matric || !surname) return fail(res, 400, "matricNumber and surname are required");

  const exists = store.collection("users").some((user) => user.matricNumber === matric);
  if (exists) return fail(res, 409, "A student with this matric number already exists");

  const student = await store.insert("users", {
    matricNumber: matric,
    matric_number: matric,
    surname: String(surname).trim(),
    email: email ? String(email).toLowerCase() : null,
    passwordHash: password ? hashPassword(password) : null,
    role: "student"
  });

  return created(res, { student: store.withoutSecrets(student) }, "Student created");
}));

router.put("/students/:id", asyncHandler(async (req, res) => {
  const student = store.collection("users").find((user) => user.id === req.params.id && user.role === "student");
  if (!student) return fail(res, 404, "Student not found");

  const patch = {};
  if (req.body.matricNumber || req.body.matric_number) {
    patch.matricNumber = String(req.body.matricNumber || req.body.matric_number).trim();
    patch.matric_number = patch.matricNumber;
  }
  if (req.body.surname) patch.surname = String(req.body.surname).trim();
  if (req.body.email !== undefined) patch.email = req.body.email ? String(req.body.email).toLowerCase() : null;
  if (req.body.password) patch.passwordHash = hashPassword(req.body.password);

  const updated = await store.update("users", req.params.id, patch);
  return ok(res, { student: store.withoutSecrets(updated) }, "Student updated");
}));

router.delete("/students/:id", asyncHandler(async (req, res) => {
  const deleted = await store.remove("users", req.params.id);
  if (!deleted) return fail(res, 404, "Student not found");
  return ok(res, null, "Student deleted");
}));

router.get("/results", (req, res) => {
  const results = buildResults();
  return ok(res, { results });
});

router.get("/results/exam/:examId", (req, res) => {
  const exam = store.collection("exams").find((item) => item.id === req.params.examId);
  if (!exam) return fail(res, 404, "Exam not found");

  const results = buildResults().filter((item) => item.exam.id === exam.id);
  return ok(res, { exam, results });
});

function buildResults() {
  return store.collection("examSessions")
    .filter((session) => session.status === "completed")
    .map((session) => {
      const exam = store.collection("exams").find((item) => item.id === session.examId);
      const student = store.collection("users").find((item) => item.id === session.studentId);
      return {
        id: session.id,
        exam,
        student: store.withoutSecrets(student),
        score: session.score,
        totalQuestions: session.totalQuestions,
        percentage: session.totalQuestions ? Math.round((session.score / session.totalQuestions) * 100) : 0,
        startedAt: session.startedAt,
        completedAt: session.completedAt
      };
    });
}

module.exports = router;
