const fs = require("fs");
const multer = require("multer");
const express = require("express");
const config = require("../config");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");
const { generateQuestionsFromPdf, formatAIGenerationError } = require("../services/aiQuestionService");

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
  const {
    examId,
    exam_id,
    question,
    options,
    correctOption,
    correct_option,
    explanation,
    questionType,
    question_type,
    difficulty
  } = req.body;
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
    explanation: explanation || "",
    questionType: questionType || question_type || "single",
    question_type: questionType || question_type || "single",
    difficulty: difficulty || "medium"
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

  if (!resolvedExamId) return fail(res, 400, "examId is required so generated questions can be saved to an exam");
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
    const formattedError = formatAIGenerationError(err);
    console.error({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      examId: resolvedExamId,
      pdfId: resolvedPdfId,
      error: formattedError.message,
      stack: formattedError.stack
    });
    if (formattedError.code === "AI_NETWORK_RESTRICTION") {
      return fail(res, 503, `${formattedError.message} Reference: ${req.id}`);
    }

    const message = `AI generation failed: ${formattedError.message} (Reference: ${req.id})`;
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
  ["question", "options", "explanation", "questionType", "question_type", "difficulty"].forEach((field) => {
    if (req.body[field] !== undefined) patch[field] = req.body[field];
  });
  if (req.body.questionType || req.body.question_type) {
    patch.questionType = req.body.questionType || req.body.question_type;
    patch.question_type = patch.questionType;
  }
  if (req.body.correctOption || req.body.correct_option) {
    patch.correctOption = req.body.correctOption || req.body.correct_option;
    patch.correct_option = patch.correctOption;
  }

  return ok(res, { question: await store.update("questions", req.params.id, patch) }, "Question updated");
}));

router.post("/delete-bulk", asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return fail(res, 400, "ids must be a non-empty array");
  }

  let deletedCount = 0;
  for (const id of ids) {
    const deleted = await store.remove("questions", id);
    if (deleted) deletedCount++;
  }

  return ok(res, { deletedCount }, `${deletedCount} questions deleted successfully`);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const deleted = await store.remove("questions", req.params.id);
  if (!deleted) return fail(res, 404, "Question not found");
  return ok(res, null, "Question deleted");
}));

module.exports = router;
