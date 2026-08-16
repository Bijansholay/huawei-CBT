const express = require("express");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");

const router = express.Router();

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

function resolveOptionLabel(value, options) {
  if (value === undefined || value === null) return "";
  const target = String(value).trim();
  if (!target) return "";
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
    const options = normalizeOptions(question?.options);
    const correctLabel = resolveAnswerLabels(question?.correctOption || question?.correct_option, options);
    const selectedLabel = resolveAnswerLabels(selected, options);
    const isCorrect = question ? (correctLabel && selectedLabel && correctLabel === selectedLabel) : false;
    
    console.log(`[SUBMIT DEBUG] Question ID: ${question?.id || answer.questionId}`);
    console.log(`[SUBMIT DEBUG] Raw Correct Option: "${question?.correctOption || question?.correct_option}"`);
    console.log(`[SUBMIT DEBUG] Raw Selected Option: "${selected}"`);
    console.log(`[SUBMIT DEBUG] Resolved Correct Label: "${correctLabel}"`);
    console.log(`[SUBMIT DEBUG] Resolved Selected Label: "${selectedLabel}"`);
    console.log(`[SUBMIT DEBUG] isCorrect: ${isCorrect}`);

    if (isCorrect) score += 1;

    try {
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
    } catch (err) {
      console.error({
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        examId: req.params.examId,
        studentId: req.user.id,
        questionId: question ? question.id : answer.questionId || answer.question_id,
        error: err.message,
        stack: err.stack
      });
    }
  }

  const completedAt = store.now();
  const finalTotalQuestions = Math.min(
    Number(exam.totalQuestions || exam.total_questions || questions.length),
    questions.length
  );

  let completed = null;
  try {
    completed = await store.update("examSessions", session.id, {
      status: "completed",
      completedAt,
      completed_at: completedAt,
      score,
      totalQuestions: finalTotalQuestions
    });
  } catch (err) {
    console.error({
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      error: err.message,
      stack: err.stack
    });
  }

  const percentage = finalTotalQuestions ? Math.round((Number(score || 0) / Number(finalTotalQuestions || 1)) * 100) : 0;

  if (!completed) {
    completed = {
      ...session,
      status: "completed",
      completedAt,
      completed_at: completedAt,
      score,
      totalQuestions: finalTotalQuestions,
      percentage
    };
    Object.assign(session, completed);
  } else {
    completed.percentage = percentage;
  }

  return ok(res, {
    result: completed,
    score,
    totalQuestions: finalTotalQuestions,
    percentage
  }, "Exam submitted");
}));

router.get("/:examId/results", authenticate, (req, res) => {
  const exam = store.collection("exams").find((item) => item.id === req.params.examId);
  if (!exam) return fail(res, 404, "Exam not found");

  const sessions = getExamSessions(req.params.examId).filter((session) => {
    return req.user.role === "admin" ? true : session.studentId === req.user.id;
  });

  return ok(res, { exam, results: sessions });
});

function getActiveSession(examId, studentId) {
  return store.collection("examSessions").find((session) => {
    return session.examId === examId && session.studentId === studentId && session.status === "active";
  });
}

function getExamSessions(examId) {
  return store.collection("examSessions")
    .filter((session) => session.examId === examId && session.status === "completed")
    .map((session) => ({
      ...session,
      percentage: session.totalQuestions ? Math.round((Number(session.score || 0) / Number(session.totalQuestions || 1)) * 100) : 0
    }))
    .sort((a, b) => {
      const aTime = new Date(a.completedAt || a.startedAt || 0).getTime();
      const bTime = new Date(b.completedAt || b.startedAt || 0).getTime();
      return bTime - aTime;
    });
}

module.exports = router;
