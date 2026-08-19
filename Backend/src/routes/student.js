const express = require("express");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");

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
    }).filter((option) => {
      const clean = option.text.trim().toLowerCase();
      return clean !== "" && clean !== "not applicable" && clean !== "n/a";
    });
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

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

router.get("/exams/:id", (req, res) => {
  const exam = getEnrolledExam(req.params.id, req.user.id);
  if (!exam) return fail(res, 404, "Exam not found or not enrolled");

  const allQuestions = store.collection("questions")
    .filter((item) => item.examId === exam.id);

  const limit = Math.max(0, Number(exam.totalQuestions || exam.total_questions || allQuestions.length));

  // Separate questions by type
  const singleQuestions = [];
  const multipleQuestions = [];
  const trueFalseQuestions = [];

  for (const q of allQuestions) {
    const type = String(q.questionType || q.question_type || "single").toLowerCase();
    if (type === "single" || type === "mcq") {
      singleQuestions.push(q);
    } else if (type === "multiple") {
      multipleQuestions.push(q);
    } else {
      trueFalseQuestions.push(q);
    }
  }

  // Shuffle each pool
  const shuffledSingle = shuffle(singleQuestions);
  const shuffledMultiple = shuffle(multipleQuestions);
  const shuffledTrueFalse = shuffle(trueFalseQuestions);

  // Targets:
  // Single choice: 37.5% (approx 35% to 40%)
  // Multiple choice: 32.5% (approx 30% to 35%)
  // True/False: 30% (approx 25% to 35%)
  const targetSingle = Math.round(limit * 0.375);
  const targetMultiple = Math.round(limit * 0.325);
  const targetTrueFalse = Math.max(0, limit - targetSingle - targetMultiple);

  let selectedSingle = shuffledSingle.slice(0, targetSingle);
  let selectedMultiple = shuffledMultiple.slice(0, targetMultiple);
  let selectedTrueFalse = shuffledTrueFalse.slice(0, targetTrueFalse);

  let currentTotal = selectedSingle.length + selectedMultiple.length + selectedTrueFalse.length;

  if (currentTotal < limit) {
    // Fill deficit from remaining unselected questions from all pools
    const remainingSingle = shuffledSingle.slice(targetSingle);
    const remainingMultiple = shuffledMultiple.slice(targetMultiple);
    const remainingTrueFalse = shuffledTrueFalse.slice(targetTrueFalse);

    const backupPool = shuffle([...remainingSingle, ...remainingMultiple, ...remainingTrueFalse]);
    const needed = limit - currentTotal;
    const extra = backupPool.slice(0, needed);

    for (const q of extra) {
      const type = String(q.questionType || q.question_type || "single").toLowerCase();
      if (type === "single" || type === "mcq") {
        selectedSingle.push(q);
      } else if (type === "multiple") {
        selectedMultiple.push(q);
      } else {
        selectedTrueFalse.push(q);
      }
    }
  }

  // Group in order: Single Choice, then Multiple Choice, then True/False
  const orderedQuestions = [...selectedSingle, ...selectedMultiple, ...selectedTrueFalse];

  const clientQuestions = orderedQuestions.map(({ correctOption, correct_option, ...question }) => normalizeStudentQuestion(question));

  return ok(res, { exam, questions: clientQuestions });
});

router.post("/exams/:id/start", asyncHandler(async (req, res) => {
  const exam = getEnrolledExam(req.params.id, req.user.id);
  if (!exam) return fail(res, 404, "Exam not found or not enrolled");
  if (exam.status !== "active") return fail(res, 400, "Exam is not active");

  const existing = store.collection("examSessions").find((session) => {
    return session.examId === exam.id && session.studentId === req.user.id && session.status === "active";
  });
  if (existing) return ok(res, { session: existing }, "Exam session already active");

  const startedAt = store.now();
  let session;
  try {
    session = await store.insert("examSessions", {
      examId: exam.id,
      exam_id: exam.id,
      studentId: req.user.id,
      student_id: req.user.id,
      status: "active",
      startedAt,
      started_at: startedAt,
      completedAt: null,
      completed_at: null,
      score: null,
      totalQuestions: Number(exam.totalQuestions || exam.total_questions)
    });
  } catch (err) {
    console.error({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      examId: exam.id,
      studentId: req.user.id,
      error: err.message,
      stack: err.stack
    });
    session = store.collection("examSessions").find((item) => {
      return item.examId === exam.id && item.studentId === req.user.id && item.status === "active";
    });

    if (!session) {
      return fail(res, 500, `Failed to start exam session. Reference: ${req.id}`);
    }
  }

  return ok(res, { session }, "Exam started");
}));

router.post("/exams/:examId/violations", asyncHandler(async (req, res) => {
  const exam = getEnrolledExam(req.params.examId, req.user.id);
  if (!exam) return fail(res, 404, "Exam not found or not enrolled");

  const {
    eventType,
    strikeCount,
    occurredAt,
    highResolutionTimestamp,
    fullscreenActive,
    visibilityState
  } = req.body || {};

  if (!eventType || !strikeCount || !occurredAt) {
    return fail(res, 400, "eventType, strikeCount, and occurredAt are required");
  }

  const session = store.collection("examSessions").find((item) => {
    return item.examId === exam.id && item.studentId === req.user.id && item.status === "active";
  });

  const violation = await store.insert("examViolations", {
    examId: exam.id,
    exam_id: exam.id,
    studentId: req.user.id,
    student_id: req.user.id,
    sessionId: session?.id || null,
    session_id: session?.id || null,
    eventType: String(eventType),
    event_type: String(eventType),
    strikeCount: Number(strikeCount),
    strike_count: Number(strikeCount),
    occurredAt: String(occurredAt),
    occurred_at: String(occurredAt),
    highResolutionTimestamp: Number(highResolutionTimestamp) || null,
    high_resolution_timestamp: Number(highResolutionTimestamp) || null,
    fullscreenActive: Boolean(fullscreenActive),
    fullscreen_active: Boolean(fullscreenActive),
    visibilityState: visibilityState ? String(visibilityState) : null,
    visibility_state: visibilityState ? String(visibilityState) : null
  });

  return created(res, { violation }, "Violation logged");
}));

function getEnrolledExam(examId, studentId) {
  const enrollment = store.collection("examEnrollments").find((item) => {
    return item.examId === examId && item.studentId === studentId && !item.deleted;
  });
  if (!enrollment) return null;
  return store.collection("exams").find((item) => item.id === examId);
}

// helper to resolve option labels (shared logic)
function resolveOptionLabel(value, options) {
  if (value === undefined || value === null) return "";
  const target = String(value).trim();
  if (!target) return "";

  // 1. Extract from prefix like "ANSWER: B", "Correct Option: B", etc.
  const prefixMatch = target.match(/(?:Answer|Correct|Correct Answer|Correct Option|Ans)[:\s-]+\s*([A-D])/i);
  if (prefixMatch) {
    return prefixMatch[1].toUpperCase();
  }

  // 2. Clean brackets e.g. "(B)", "[B]", "B.", "B)"
  const cleanTarget = target.replace(/^[\(\[\{]?([A-D])[\)\]\.]?$/i, "$1").toUpperCase();
  if (["A", "B", "C", "D"].includes(cleanTarget)) {
    return cleanTarget;
  }

  const normalizedTarget = target.toLowerCase();
  const upperTarget = target.toUpperCase();

  const byLabel = options.find((option) => String(option.label || "").toUpperCase() === upperTarget);
  if (byLabel) return String(byLabel.label || "").toUpperCase();

  const byText = options.find((option) => String(option.text || "").trim().toLowerCase() === normalizedTarget);
  if (byText) return String(byText.label || "").toUpperCase();

  return upperTarget;
}

function resolveAnswerLabels(value, options) {
  if (value === undefined || value === null) return "";
  const items = String(value)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const resolved = items.map(item => resolveOptionLabel(item, options));
  return resolved.filter(Boolean).sort().join(",");
}

// GET /exams/:id/review - review the most recent completed session for the current student
router.get('/exams/:id/review', (req, res) => {
  const exam = getEnrolledExam(req.params.id, req.user.id);
  if (!exam) return fail(res, 404, 'Exam not found or not enrolled');

  const sessions = store.collection('examSessions')
    .filter((s) => s.examId === exam.id && s.studentId === req.user.id && s.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.startedAt || 0).getTime() - new Date(a.completedAt || a.startedAt || 0).getTime());

  const session = sessions[0];
  if (!session) return fail(res, 400, 'No completed session found for this exam');

  const answers = store.collection('examAnswers').filter((a) => a.sessionId === session.id || a.session_id === session.id);

  const review = answers.map((ans) => {
    const question = store.collection('questions').find((q) => q.id === ans.questionId || q.id === ans.question_id);
    const options = normalizeOptions(question?.options);
    const correctLabel = resolveAnswerLabels(question?.correctOption || question?.correct_option, options);
    const selectedLabel = resolveAnswerLabels(ans.selectedOption || ans.selected_option, options);

    return {
      questionId: question ? question.id : ans.questionId || ans.question_id,
      question: question ? question.question : null,
      options,
      correctOption: correctLabel || (question ? (question.correctOption || question.correct_option) : null),
      selectedOption: selectedLabel || (ans.selectedOption || ans.selected_option || null),
      isCorrect: Boolean(ans.isCorrect || ans.is_correct),
      explanation: question ? question.explanation : null
    };
  });

  return ok(res, { session, review });
});


module.exports = router;
