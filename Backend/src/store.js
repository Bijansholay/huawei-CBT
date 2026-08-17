const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { createClient } = require("@supabase/supabase-js");
const config = require("./config");
const { hashPassword } = require("./utils/crypto");

const now = () => new Date().toISOString();

const tableMap = {
  users: "users",
  exams: "exams",
  examEnrollments: "exam_enrollments",
  examSessions: "exam_sessions",
  pdfs: "pdfs",
  questions: "questions",
  examAnswers: "exam_answers",
  examViolations: "exam_violations"
};

const initialState = () => ({
  users: [],
  exams: [],
  examEnrollments: [],
  examSessions: [],
  pdfs: [],
  questions: [],
  examAnswers: [],
  examViolations: []
});

let state = initialState();
let supabase = null;

function withoutSecrets(user) {
  if (!user) return null;
  const { passwordHash, password_hash, ...safeUser } = user;
  return safeUser;
}

function camelizeRecord(record) {
  if (!record) return null;
  return {
    ...record,
    matricNumber: record.matric_number ?? record.matricNumber,
    track: record.track ?? record.track_name ?? record.trackName,
    passwordHash: record.password_hash ?? record.passwordHash,
    createdAt: record.created_at ?? record.createdAt,
    updatedAt: record.updated_at ?? record.updatedAt,
    durationMinutes: record.duration_minutes ?? record.durationMinutes,
    totalQuestions: record.total_questions ?? record.totalQuestions,
    pdfId: record.pdf_id ?? record.pdfId,
    createdBy: record.created_by ?? record.createdBy,
    examId: record.exam_id ?? record.examId,
    studentId: record.student_id ?? record.studentId,
    sessionId: record.session_id ?? record.sessionId,
    highResolutionTimestamp: record.high_resolution_timestamp ?? record.highResolutionTimestamp,
    enrolledAt: record.enrolled_at ?? record.enrolledAt,
    startedAt: record.started_at ?? record.startedAt,
    completedAt: record.completed_at ?? record.completedAt,
    questionId: record.question_id ?? record.questionId,
    selectedOption: record.selected_option ?? record.selectedOption,
    isCorrect: record.is_correct ?? record.isCorrect,
    correctOption: record.correct_option ?? record.correctOption,
    questionType: record.question_type ?? record.questionType,
    originalName: record.original_name ?? record.originalName,
    mimeType: record.mime_type ?? record.mimeType,
    uploadedBy: record.uploaded_by ?? record.uploadedBy,
    eventType: record.event_type ?? record.eventType,
    strikeCount: record.strike_count ?? record.strikeCount,
    occurredAt: record.occurred_at ?? record.occurredAt,
    fullscreenActive: record.fullscreen_active ?? record.fullscreenActive,
    visibilityState: record.visibility_state ?? record.visibilityState
  };
}

function toDbRecord(name, record) {
  const item = { ...record };

  const mappings = {
    matricNumber: "matric_number",
    track: "track",
    passwordHash: "password_hash",
    createdAt: "created_at",
    updatedAt: "updated_at",
    durationMinutes: "duration_minutes",
    totalQuestions: "total_questions",
    pdfId: "pdf_id",
    createdBy: "created_by",
    examId: "exam_id",
    studentId: "student_id",
    sessionId: "session_id",
    highResolutionTimestamp: "high_resolution_timestamp",
    enrolledAt: "enrolled_at",
    startedAt: "started_at",
    completedAt: "completed_at",
    questionId: "question_id",
    selectedOption: "selected_option",
    isCorrect: "is_correct",
    correctOption: "correct_option",
    questionType: "question_type",
    originalName: "original_name",
    mimeType: "mime_type",
    uploadedBy: "uploaded_by",
    eventType: "event_type",
    strikeCount: "strike_count",
    occurredAt: "occurred_at",
    fullscreenActive: "fullscreen_active",
    visibilityState: "visibility_state"
  };

  for (const [camel, snake] of Object.entries(mappings)) {
    if (item[camel] !== undefined) {
      item[snake] = item[camel];
    }
    if (camel !== snake) {
      delete item[camel];
    }
  }

  delete item.deleted;
  return item;
}

function loadFile() {
  const file = path.resolve(config.dataFile);
  if (fs.existsSync(file)) {
    const loaded = JSON.parse(fs.readFileSync(file, "utf8"));
    state = {
      ...initialState(),
      ...loaded,
      users: (loaded.users || []).map(camelizeRecord),
      exams: (loaded.exams || []).map(camelizeRecord),
      examEnrollments: (loaded.examEnrollments || []).map(camelizeRecord),
      examSessions: (loaded.examSessions || []).map(camelizeRecord),
      pdfs: (loaded.pdfs || []).map(camelizeRecord),
      questions: (loaded.questions || []).map(camelizeRecord),
      examAnswers: (loaded.examAnswers || []).map(camelizeRecord),
      examViolations: (loaded.examViolations || []).map(camelizeRecord)
    };
  }
}

function saveFile() {
  const file = path.resolve(config.dataFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

async function loadSupabase() {
  supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: { persistSession: false }
  });

  for (const [name, table] of Object.entries(tableMap)) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      throw new Error(`Supabase load failed for ${table}: ${error.message}`);
    }
    state[name] = (data || []).map(camelizeRecord);
  }
}

async function seedAdmin() {
  const superAdminEmail = config.adminEmail.trim().toLowerCase();
  const existing = state.users.find((user) => String(user.email || "").trim().toLowerCase() === superAdminEmail);
  if (existing) {
    if (existing.role !== "admin") {
      throw new Error(`ADMIN_EMAIL is already used by a non-admin account: ${config.adminEmail}`);
    }
    return;
  }

  await insert("users", {
    matricNumber: null,
    surname: "Admin",
    email: superAdminEmail,
    passwordHash: hashPassword(config.adminPassword),
    role: "admin"
  });
}

async function initialize() {
  if (config.storageDriver === "supabase") {
    await loadSupabase();
  } else {
    loadFile();
  }
  await seedAdmin();
  await save();
}

function collection(name) {
  return state[name];
}

async function persistInsert(name, item) {
  if (config.storageDriver === "supabase") {
    const { error } = await supabase.from(tableMap[name]).insert(toDbRecord(name, item));
    if (error) throw new Error(`Supabase insert failed for ${tableMap[name]}: ${error.message}`);
    return;
  }
  saveFile();
}

async function persistUpdate(name, id, patch) {
  if (config.storageDriver === "supabase") {
    const { error } = await supabase.from(tableMap[name]).update(toDbRecord(name, patch)).eq("id", id);
    if (error) throw new Error(`Supabase update failed for ${tableMap[name]}: ${error.message}`);
    return;
  }
  saveFile();
}

async function persistDelete(name, id) {
  if (config.storageDriver === "supabase") {
    const { error } = await supabase.from(tableMap[name]).delete().eq("id", id);
    if (error) throw new Error(`Supabase delete failed for ${tableMap[name]}: ${error.message}`);
    return;
  }
  saveFile();
}

async function insert(name, record) {
  const item = {
    id: record.id || uuid(),
    ...record,
    createdAt: record.createdAt || now(),
    updatedAt: record.updatedAt || now()
  };
  state[name].push(item);
  await persistInsert(name, item);
  return item;
}

async function update(name, id, patch) {
  const item = state[name].find((record) => record.id === id);
  if (!item) return null;
  Object.assign(item, patch, { updatedAt: now() });
  await persistUpdate(name, id, { ...patch, updatedAt: item.updatedAt });
  return item;
}

async function remove(name, id) {
  const before = state[name].length;
  state[name] = state[name].filter((record) => record.id !== id);
  if (state[name].length === before) return false;
  await persistDelete(name, id);
  return true;
}

async function save() {
  if (config.storageDriver !== "supabase") saveFile();
}

function resetForTests(nextState = initialState()) {
  state = nextState;
}

const ready = initialize();

module.exports = {
  now,
  uuid,
  ready,
  withoutSecrets,
  collection,
  insert,
  update,
  remove,
  save,
  resetForTests
};
