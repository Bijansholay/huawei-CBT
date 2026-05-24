const express = require("express");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");

const router = express.Router();
router.use(authenticate, requireRole("admin"));

router.get("/", (req, res) => {
  const questions = req.query.examId
    ? store.collection("questions").filter((item) => item.examId === req.query.examId)
    : store.collection("questions");
  return ok(res, { questions });
});

router.post("/", asyncHandler(async (req, res) => {
  const { examId, exam_id, question, options, correctOption, correct_option, explanation } = req.body;
  const exam = store.collection("exams").find((item) => item.id === (examId || exam_id));
  if (!exam) return fail(res, 404, "Exam not found");
  if (!question || !options || !correctOption && !correct_option) {
    return fail(res, 400, "question, options, and correctOption are required");
  }

  const item = await store.insert("questions", {
    examId: exam.id,
    exam_id: exam.id,
    question,
    options,
    correctOption: correctOption || correct_option,
    correct_option: correctOption || correct_option,
    explanation: explanation || ""
  });

  return created(res, { question: item }, "Question created");
}));

router.post("/generate", asyncHandler(async (req, res) => {
  const { examId, exam_id, count } = req.body;
  const exam = store.collection("exams").find((item) => item.id === (examId || exam_id));
  if (!exam) return fail(res, 404, "Exam not found");

  const total = Number(count || exam.totalQuestions || 5);
  const questions = Array.from({ length: total }, (_, index) => {
    return store.insert("questions", {
      examId: exam.id,
      exam_id: exam.id,
      question: `Generated question ${index + 1} for ${exam.title}`,
      options: ["A", "B", "C", "D"].map((label) => ({ label, text: `Option ${label}` })),
      correctOption: "A",
      correct_option: "A",
      explanation: "Replace this generated placeholder with AI-generated content when PDF parsing is connected."
    });
  });

  return created(res, { questions: await Promise.all(questions) }, "Questions generated");
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const question = store.collection("questions").find((item) => item.id === req.params.id);
  if (!question) return fail(res, 404, "Question not found");

  const patch = {};
  ["question", "options", "explanation"].forEach((field) => {
    if (req.body[field] !== undefined) patch[field] = req.body[field];
  });
  if (req.body.correctOption || req.body.correct_option) {
    patch.correctOption = req.body.correctOption || req.body.correct_option;
    patch.correct_option = patch.correctOption;
  }

  return ok(res, { question: await store.update("questions", req.params.id, patch) }, "Question updated");
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const deleted = await store.remove("questions", req.params.id);
  if (!deleted) return fail(res, 404, "Question not found");
  return ok(res, null, "Question deleted");
}));

module.exports = router;
