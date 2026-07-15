const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "development";
process.env.DATA_FILE = path.join(os.tmpdir(), `huawei-cbt-test-${process.pid}.json`);
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
    const superAdminId = adminLogin.json.data.user.id;
    assert.equal(adminLogin.json.data.user.isSuperAdmin, true);

    const adminCreate = await request(baseUrl, "POST", "/api/admin/admins", {
      email: "manager@test.local",
      surname: "Manager",
      password: "manager-password"
    }, adminToken);
    assert.equal(adminCreate.response.status, 201);
    const managerId = adminCreate.json.data.admin.id;
    const managerLogin = await request(baseUrl, "POST", "/api/auth/login", {
      email: "manager@test.local",
      password: "manager-password"
    });
    assert.equal(managerLogin.response.status, 200);
    const managerToken = managerLogin.json.data.token;
    assert.equal(managerLogin.json.data.user.isSuperAdmin, false);

    const adminsList = await request(baseUrl, "GET", "/api/admin/admins", null, adminToken);
    assert.equal(adminsList.response.status, 200);
    assert.equal(adminsList.json.data.admins.some((admin) => admin.isSuperAdmin), true);

    const managerCreateDenied = await request(baseUrl, "POST", "/api/admin/admins", {
      email: "blocked@test.local",
      surname: "Blocked",
      password: "blocked-password"
    }, managerToken);
    assert.equal(managerCreateDenied.response.status, 403);

    const managerUpdateDenied = await request(baseUrl, "PUT", `/api/admin/admins/${managerId}`, {
      surname: "Blocked Edit"
    }, managerToken);
    assert.equal(managerUpdateDenied.response.status, 403);

    const deleteSuperAdmin = await request(baseUrl, "DELETE", `/api/admin/admins/${superAdminId}`, null, managerToken);
    assert.equal(deleteSuperAdmin.response.status, 403);

    const studentCreate = await request(baseUrl, "POST", "/api/admin/students", {
      matricNumber: "CBT/001",
      surname: "Adeleke",
      track: "ND 2A"
    }, adminToken);
    assert.equal(studentCreate.response.status, 201);
    const studentId = studentCreate.json.data.student.id;
    assert.equal(studentCreate.json.data.student.track, "ND 2A");

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

    const questionUpdate = await request(baseUrl, "PUT", `/api/questions/${questionId}`, {
      question: "What does CPU stand for in computing?"
    }, adminToken);
    assert.equal(questionUpdate.response.status, 200);
    assert.equal(questionUpdate.json.data.question.question, "What does CPU stand for in computing?");

    const tempQuestion = await request(baseUrl, "POST", "/api/questions", {
      examId,
      question: "Temporary question",
      options: ["One", "Two"],
      correctOption: "One"
    }, adminToken);
    assert.equal(tempQuestion.response.status, 201);
    const tempQuestionId = tempQuestion.json.data.question.id;

    const deleteQuestion = await request(baseUrl, "DELETE", `/api/questions/${tempQuestionId}`, null, adminToken);
    assert.equal(deleteQuestion.response.status, 200);

    const enroll = await request(baseUrl, "POST", `/api/exams/${examId}/enroll`, {
      studentIds: [studentId]
    }, adminToken);
    assert.equal(enroll.response.status, 200);

    const examStudents = await request(baseUrl, "GET", `/api/exams/${examId}/students`, null, adminToken);
    assert.equal(examStudents.response.status, 200);
    assert.equal(examStudents.json.data.students.length, 1);
    assert.equal(examStudents.json.data.students[0].track, "ND 2A");

    const studentLogin = await request(baseUrl, "POST", "/api/auth/login", {
      matricNumber: "CBT/001",
      surname: "Adeleke"
    });
    assert.equal(studentLogin.response.status, 200);
    const studentToken = studentLogin.json.data.token;

    const start = await request(baseUrl, "POST", `/api/student/exams/${examId}/start`, null, studentToken);
    assert.equal(start.response.status, 200);

    const violation = await request(baseUrl, "POST", `/api/student/exams/${examId}/violations`, {
      eventType: "blur",
      strikeCount: 1,
      occurredAt: new Date().toISOString(),
      highResolutionTimestamp: 1234.56,
      fullscreenActive: false,
      visibilityState: "visible"
    }, studentToken);
    assert.equal(violation.response.status, 201);
    assert.equal(violation.json.data.violation.strikeCount, 1);

    const submit = await request(baseUrl, "POST", `/api/exams/${examId}/submit`, {
      answers: [{ questionId, selectedOption: "A" }]
    }, studentToken);
    assert.equal(submit.response.status, 200);
    assert.equal(submit.json.data.result.score, 1);
    assert.equal(submit.json.data.score, 1);
    assert.equal(submit.json.data.totalQuestions, 1);
    assert.equal(submit.json.data.percentage, 100);

    const results = await request(baseUrl, "GET", `/api/admin/results/exam/${examId}`, null, adminToken);
    assert.equal(results.response.status, 200);
    assert.equal(results.json.data.results.length, 1);
    assert.equal(results.json.data.results[0].score, 1);
    assert.equal(results.json.data.results[0].percentage, 100);
  } finally {
    server.close();
    if (fs.existsSync(process.env.DATA_FILE)) fs.unlinkSync(process.env.DATA_FILE);
  }
});
