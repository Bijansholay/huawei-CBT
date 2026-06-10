const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("file store normalizes legacy student track fields on load", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "huawei-cbt-store-"));
  const dataFile = path.join(tempDir, "store.json");

  const legacyState = {
    users: [
      {
        id: "student-1",
        matric_number: "CBT/001",
        surname: "Adeleke",
        track_name: "ND 2A",
        role: "student",
        created_at: "2026-06-10T00:00:00.000Z",
        updated_at: "2026-06-10T00:00:00.000Z"
      }
    ],
    exams: [],
    examEnrollments: [],
    examSessions: [],
    pdfs: [],
    questions: [],
    examAnswers: []
  };

  fs.writeFileSync(dataFile, JSON.stringify(legacyState, null, 2));

  const previousEnv = {
    NODE_ENV: process.env.NODE_ENV,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    DATA_FILE: process.env.DATA_FILE,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET
  };

  process.env.NODE_ENV = "development";
  process.env.STORAGE_DRIVER = "file";
  process.env.DATA_FILE = dataFile;
  process.env.ADMIN_EMAIL = "admin@test.local";
  process.env.ADMIN_PASSWORD = "admin-password";
  process.env.JWT_SECRET = "test-secret";

  const storePath = require.resolve("../src/store");
  delete require.cache[storePath];

  try {
    const store = require("../src/store");
    await store.ready;

    const student = store.collection("users").find((user) => user.id === "student-1");
    assert.ok(student);
    assert.equal(student.track, "ND 2A");
    assert.equal(student.matricNumber, "CBT/001");
  } finally {
    delete require.cache[storePath];
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile);
    fs.rmSync(tempDir, { recursive: true, force: true });

    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});
