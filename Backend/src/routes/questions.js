const fs = require("fs");
const multer = require("multer");
const express = require("express");
const config = require("../config");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");
const { generateQuestionsFromPdf } = require("../services/aiQuestionService");

const upload = multer({ dest: "uploads/" });
const router = express.Router();
router.use(authenticate, requireRole("admin"));

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

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

router.post("/generate", upload.single("pdf"), asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { examId, exam_id, pdfId, pdf_id, count, num_questions, difficulty } = body;
  const resolvedExamId = examId || exam_id || null;
  const resolvedPdfId = pdfId || pdf_id || null;
  const typeCounts = parseMaybeJson(body.typeCounts);
  const difficultyCounts = parseMaybeJson(body.difficultyCounts);
  const exam = resolvedExamId
    ? store.collection("exams").find((item) => item.id === resolvedExamId)
    : null;
  const pdf = req.file
    ? { path: req.file.path, originalName: req.file.originalname, mimeType: req.file.mimetype }
    : resolvedPdfId
      ? store.collection("pdfs").find((item) => item.id === resolvedPdfId)
      : null;

  if (resolvedExamId && !exam) return fail(res, 404, "Exam not found");
  if (!pdf) return fail(res, 404, "PDF not found");

  const total = Number(count || num_questions || exam?.totalQuestions || 5);
  try {
    const generated = await generateQuestionsFromPdf({
      pdf,
      count: total,
      difficulty,
      typeCounts,
      difficultyCounts
    });

    if (!exam) {
      return created(res, { questions: generated }, "Questions generated");
    }

    const questions = generated.map((question) => {
      return store.insert("questions", {
        examId: exam.id,
        exam_id: exam.id,
        question: question.question,
        question_text: question.question,
        options: question.options,
        correctOption: question.correctOption,
        correct_option: question.correctOption,
        explanation: question.explanation,
        difficulty: question.difficulty,
        questionType: question.questionType,
        question_type: question.questionType
      });
    });

    return created(res, { questions: await Promise.all(questions) }, "Questions generated and saved");
  } catch (err) {
    console.error({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      examId: resolvedExamId,
      pdfId: resolvedPdfId,
      error: err.message,
      stack: err.stack
    });
    const message = config.isProduction
      ? `AI generation failed. Reference: ${req.id}`
      : `AI generation failed: ${err.message}`;
    return fail(res, 500, message);
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
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
