const express = require("express");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, fail, asyncHandler } = require("../utils/http");

const router = express.Router();
router.use(authenticate, requireRole("student"));

const OPTION_LABELS = ["A", "B", "C", "D"];

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options.slice(0, 4).map((option, index) => {
      if (typeof option === "string") {
        return { label: OPTION_LABELS[index] || String(index + 1), text: option };
      }

      if (option && typeof option === "object") {
        return {
          label: String(option.label || OPTION_LABELS[index] || String(index + 1)).toUpperCase(),
          text: String(option.text || option.value || option.optionText || option.label || "")
        };
      }

      return { label: OPTION_LABELS[index] || String(index + 1), text: String(option ?? "") };
    }).filter((option) => option.text !== "");
  }

  if (options && typeof options === "object") {
    return Object.entries(options).map(([label, text]) => ({
      label: String(label).toUpperCase(),
      text: String(text)
    }));
  }

  return [];
}

function normalizeStudentQuestion(question) {
  return {
    ...question,
    options: normalizeOptions(question.options)
  };
}

router.get("/exams", (req, res) => {
  const enrolledExamIds = store.collection("examEnrollments")
    .filter((item) => item.studentId === req.user.id && !item.deleted)
    .map((item) => item.examId);

  const exams = store.collection("exams")
    .filter((exam) => enrolledExamIds.includes(exam.id) && exam.status !== "draft");

  return ok(res, { exams });
});

router.get("/exams/:id", (req, res) => {
  const exam = getEnrolledExam(req.params.id, req.user.id);
  if (!exam) return fail(res, 404, "Exam not found or not enrolled");

  const questions = store.collection("questions")
    .filter((item) => item.examId === exam.id)
    .map(({ correctOption, correct_option, ...question }) => normalizeStudentQuestion(question));

  return ok(res, { exam, questions });
});

router.post("/exams/:id/start", asyncHandler(async (req, res) => {
  const exam = getEnrolledExam(req.params.id, req.user.id);
  if (!exam) return fail(res, 404, "Exam not found or not enrolled");
  if (exam.status !== "active") return fail(res, 400, "Exam is not active");

  const existing = store.collection("examSessions").find((session) => {
    return session.examId === exam.id && session.studentId === req.user.id && session.status === "active";
  });
  if (existing) return ok(res, { session: existing }, "Exam session already active");

  const session = await store.insert("examSessions", {
    examId: exam.id,
    exam_id: exam.id,
    studentId: req.user.id,
    student_id: req.user.id,
    status: "active",
    startedAt: store.now(),
    started_at: store.now(),
    completedAt: null,
    completed_at: null,
    score: null,
    totalQuestions: Number(exam.totalQuestions || exam.total_questions)
  });

  return ok(res, { session }, "Exam started");
}));

function getEnrolledExam(examId, studentId) {
  const enrollment = store.collection("examEnrollments").find((item) => {
    return item.examId === examId && item.studentId === studentId && !item.deleted;
  });
  if (!enrollment) return null;
  return store.collection("exams").find((item) => item.id === examId);
}

module.exports = router;
