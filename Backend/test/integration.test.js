const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

process.env.NODE_ENV = "development";
process.env.DATA_FILE = path.join("/private/tmp", `huawei-cbt-test-${process.pid}.json`);
process.env.STORAGE_DRIVER = "file";
process.env.ADMIN_EMAIL = "admin@test.local";
process.env.ADMIN_PASSWORD = "admin-password";
process.env.JWT_SECRET = "test-secret";

const app = require("../src/app");

function listen() {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function request(baseUrl, method, pathName, body, token) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json();
  return { response, json };
}

test("frontend integration API flow", async () => {
  const { server, baseUrl } = await listen();

  try {
    const adminLogin = await request(baseUrl, "POST", "/api/auth/login", {
      email: "admin@test.local",
      password: "admin-password"
    });
    assert.equal(adminLogin.response.status, 200);
    const adminToken = adminLogin.json.data.token;

    const studentCreate = await request(baseUrl, "POST", "/api/admin/students", {
      matricNumber: "CBT/001",
      surname: "Adeleke"
    }, adminToken);
    assert.equal(studentCreate.response.status, 201);
    const studentId = studentCreate.json.data.student.id;

    const examCreate = await request(baseUrl, "POST", "/api/exams", {
      title: "Computer Basics",
      durationMinutes: 30,
      totalQuestions: 1,
      status: "active"
    }, adminToken);
    assert.equal(examCreate.response.status, 201);
    const examId = examCreate.json.data.exam.id;

    const questionCreate = await request(baseUrl, "POST", "/api/questions", {
      examId,
      question: "What does CPU stand for?",
      options: [
        { label: "A", text: "Central Processing Unit" },
        { label: "B", text: "Control Power Unit" }
      ],
      correctOption: "A"
    }, adminToken);
    assert.equal(questionCreate.response.status, 201);
    const questionId = questionCreate.json.data.question.id;

    const enroll = await request(baseUrl, "POST", `/api/exams/${examId}/enroll`, {
      studentIds: [studentId]
    }, adminToken);
    assert.equal(enroll.response.status, 200);

    const studentLogin = await request(baseUrl, "POST", "/api/auth/login", {
      matricNumber: "CBT/001",
      surname: "Adeleke"
    });
    assert.equal(studentLogin.response.status, 200);
    const studentToken = studentLogin.json.data.token;

    const start = await request(baseUrl, "POST", `/api/student/exams/${examId}/start`, null, studentToken);
    assert.equal(start.response.status, 200);

    const submit = await request(baseUrl, "POST", `/api/exams/${examId}/submit`, {
      answers: [{ questionId, selectedOption: "A" }]
    }, studentToken);
    assert.equal(submit.response.status, 200);
    assert.equal(submit.json.data.result.score, 1);

    const results = await request(baseUrl, "GET", `/api/admin/results/exam/${examId}`, null, adminToken);
    assert.equal(results.response.status, 200);
    assert.equal(results.json.data.results.length, 1);
  } finally {
    server.close();
    if (fs.existsSync(process.env.DATA_FILE)) fs.unlinkSync(process.env.DATA_FILE);
  }
});
