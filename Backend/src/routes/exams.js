const express = require("express");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");

const router = express.Router();

router.get("/", authenticate, requireRole("admin"), (req, res) => {
  return ok(res, { exams: store.collection("exams") });
});

router.post("/", authenticate, requireRole("admin"), asyncHandler(async (req, res) => {
  const { title, description, durationMinutes, duration_minutes, totalQuestions, total_questions, pdfId, pdf_id, status } = req.body;
  const duration = Number(durationMinutes || duration_minutes);
  const total = Number(totalQuestions || total_questions);

  if (!title || !duration || !total) {
    return fail(res, 400, "title, durationMinutes, and totalQuestions are required");
  }

  const exam = await store.insert("exams", {
    title: String(title).trim(),
    description: description || "",
    durationMinutes: duration,
    duration_minutes: duration,
    totalQuestions: total,
    total_questions: total,
    pdfId: pdfId || pdf_id || null,
    pdf_id: pdfId || pdf_id || null,
    createdBy: req.user.id,
    created_by: req.user.id,
    status: status || "draft"
  });

  return created(res, { exam }, "Exam created");
}));

router.get("/:id", authenticate, requireRole("admin"), (req, res) => {
  const exam = store.collection("exams").find((item) => item.id === req.params.id);
  if (!exam) return fail(res, 404, "Exam not found");

  const questions = store.collection("questions").filter((item) => item.examId === exam.id);
  return ok(res, { exam, questions });
});

router.put("/:id", authenticate, requireRole("admin"), asyncHandler(async (req, res) => {
  const exam = store.collection("exams").find((item) => item.id === req.params.id);
  if (!exam) return fail(res, 404, "Exam not found");

  const patch = {};
  if (req.body.title) patch.title = String(req.body.title).trim();
  if (req.body.description !== undefined) patch.description = req.body.description;
  if (req.body.durationMinutes || req.body.duration_minutes) {
    patch.durationMinutes = Number(req.body.durationMinutes || req.body.duration_minutes);
    patch.duration_minutes = patch.durationMinutes;
  }
  if (req.body.totalQuestions || req.body.total_questions) {
    patch.totalQuestions = Number(req.body.totalQuestions || req.body.total_questions);
    patch.total_questions = patch.totalQuestions;
  }
  if (req.body.pdfId !== undefined || req.body.pdf_id !== undefined) {
    patch.pdfId = req.body.pdfId || req.body.pdf_id || null;
    patch.pdf_id = patch.pdfId;
  }
  if (req.body.status) patch.status = req.body.status;

  return ok(res, { exam: await store.update("exams", req.params.id, patch) }, "Exam updated");
}));

router.delete("/:id", authenticate, requireRole("admin"), asyncHandler(async (req, res) => {
  const deleted = await store.remove("exams", req.params.id);
  if (!deleted) return fail(res, 404, "Exam not found");
  store.collection("examEnrollments").forEach((item) => {
    if (item.examId === req.params.id) item.deleted = true;
  });
  await store.save();
  return ok(res, null, "Exam deleted");
}));

router.post("/:id/enroll", authenticate, requireRole("admin"), asyncHandler(async (req, res) => {
  const exam = store.collection("exams").find((item) => item.id === req.params.id);
  if (!exam) return fail(res, 404, "Exam not found");

  const studentIds = req.body.studentIds || req.body.student_ids || [];
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return fail(res, 400, "studentIds must be a non-empty array");
  }

  const enrollments = [];
  for (const studentId of studentIds) {
    const student = store.collection("users").find((user) => user.id === studentId && user.role === "student");
    if (!student) continue;

    const existing = store.collection("examEnrollments").find((item) => item.examId === exam.id && item.studentId === student.id);
    if (existing) {
      enrollments.push(existing);
    } else {
      enrollments.push(await store.insert("examEnrollments", {
        examId: exam.id,
        exam_id: exam.id,
        studentId: student.id,
        student_id: student.id,
        enrolledAt: store.now(),
        enrolled_at: store.now()
      }));
    }
  }

  return ok(res, { enrollments }, "Students enrolled");
}));

router.get("/:id/students", authenticate, requireRole("admin"), (req, res) => {
  const exam = store.collection("exams").find((item) => item.id === req.params.id);
  if (!exam) return fail(res, 404, "Exam not found");

  const students = store.collection("examEnrollments")
    .filter((item) => item.examId === exam.id && !item.deleted)
    .map((item) => store.collection("users").find((user) => user.id === item.studentId))
    .filter(Boolean)
    .map(store.withoutSecrets);

  return ok(res, { students });
});

router.post("/:examId/submit", authenticate, requireRole("student"), asyncHandler(async (req, res) => {
  const exam = store.collection("exams").find((item) => item.id === req.params.examId);
  if (!exam) return fail(res, 404, "Exam not found");

  const session = getActiveSession(exam.id, req.user.id);
  if (!session) return fail(res, 400, "Start the exam before submitting answers");

  const answers = req.body.answers || [];
  if (!Array.isArray(answers)) return fail(res, 400, "answers must be an array");

  const questions = store.collection("questions").filter((item) => item.examId === exam.id);
  let score = 0;

  for (const answer of answers) {
    const question = questions.find((item) => item.id === answer.questionId || item.id === answer.question_id);
    const selected = answer.selectedOption || answer.selected_option || answer.answer;
    const isCorrect = question && String(question.correctOption).toUpperCase() === String(selected).toUpperCase();
    if (isCorrect) score += 1;

    await store.insert("examAnswers", {
      sessionId: session.id,
      session_id: session.id,
      questionId: question ? question.id : answer.questionId || answer.question_id,
      question_id: question ? question.id : answer.questionId || answer.question_id,
      selectedOption: selected,
      selected_option: selected,
      isCorrect: Boolean(isCorrect),
      is_correct: Boolean(isCorrect)
    });
  }

  const completed = await store.update("examSessions", session.id, {
    status: "completed",
    completedAt: store.now(),
    completed_at: store.now(),
    score,
    totalQuestions: questions.length || Number(exam.totalQuestions)
  });

  return ok(res, { result: completed }, "Exam submitted");
}));

router.get("/:examId/results", authenticate, (req, res) => {
  const sessions = store.collection("examSessions").filter((session) => {
    const sameExam = session.examId === req.params.examId;
    return req.user.role === "admin" ? sameExam : sameExam && session.studentId === req.user.id;
  });

  return ok(res, { results: sessions });
});

function getActiveSession(examId, studentId) {
  return store.collection("examSessions").find((session) => {
    return session.examId === examId && session.studentId === studentId && session.status === "active";
  });
}

module.exports = router;
