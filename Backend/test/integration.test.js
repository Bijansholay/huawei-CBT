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
const { Readable } = require("node:stream");
const { ServerResponse } = require("node:http");
const { Socket } = require("node:net");

function createMockReq(method, url, headers = {}, body = "") {
  const req = Readable.from(Buffer.from(body));
  req.method = method;
  req.url = url;
  req.headers = {};
  for (const [key, value] of Object.entries(headers)) {
    req.headers[key.toLowerCase()] = value;
  }
  return req;
}

class MockRes extends ServerResponse {
  constructor(req, callback) {
    const socket = new Socket();
    socket.writable = true;
    socket.write = () => true;

    req.socket = socket;
    req.connection = socket;

    super(req);
    this.req = req;
    this.callback = callback;
    this.body = Buffer.alloc(0);

    this.write = (chunk, encoding, cb) => {
      if (chunk) {
        const buf = typeof chunk === "string" ? Buffer.from(chunk, encoding) : chunk;
        this.body = Buffer.concat([this.body, buf]);
      }
      return true;
    };

    this.end = (chunk, encoding, cb) => {
      if (chunk) {
        const buf = typeof chunk === "string" ? Buffer.from(chunk, encoding) : chunk;
        this.body = Buffer.concat([this.body, buf]);
      }
      const bodyStr = this.body.toString("utf8");
      let json = null;
      try {
        json = JSON.parse(bodyStr);
      } catch (e) {
        json = bodyStr;
      }
      this.callback(null, {
        statusCode: this.statusCode,
        headers: this.getHeaders(),
        json
      });
    };
  }
}

function runMockRequest(app, method, pathName, headers = {}, bodyObj = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = bodyObj ? JSON.stringify(bodyObj) : "";
    const reqHeaders = {
      ...headers,
      "content-type": "application/json",
      "content-length": Buffer.byteLength(bodyStr).toString()
    };
    const req = createMockReq(method, pathName, reqHeaders, bodyStr);
    const res = new MockRes(req, (err, result) => {
      if (err) return reject(err);
      resolve({
        response: { status: result.statusCode },
        json: result.json
      });
    });

    app(req, res);
  });
}

function listen() {
  return Promise.resolve({
    server: { close() {} },
    baseUrl: ""
  });
}

function request(baseUrl, method, pathName, body, token) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  return runMockRequest(app, method, pathName, headers, body);
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

    // Bulk deletion test
    const bulkQ1 = await request(baseUrl, "POST", "/api/questions", {
      examId,
      question: "Bulk Q 1",
      options: ["Yes", "No"],
      correctOption: "Yes"
    }, adminToken);
    const bulkQ2 = await request(baseUrl, "POST", "/api/questions", {
      examId,
      question: "Bulk Q 2",
      options: ["Yes", "No"],
      correctOption: "Yes"
    }, adminToken);
    assert.equal(bulkQ1.response.status, 201);
    assert.equal(bulkQ2.response.status, 201);

    const bulkQ1Id = bulkQ1.json.data.question.id;
    const bulkQ2Id = bulkQ2.json.data.question.id;

    const bulkDelete = await request(baseUrl, "POST", "/api/questions/delete-bulk", {
      ids: [bulkQ1Id, bulkQ2Id]
    }, adminToken);
    assert.equal(bulkDelete.response.status, 200);
    assert.equal(bulkDelete.json.data.deletedCount, 2);

    const enroll = await request(baseUrl, "POST", `/api/exams/${examId}/enroll`, {
      studentIds: [studentId]
    }, adminToken);
    assert.equal(enroll.response.status, 200);

    const examStudents = await request(baseUrl, "GET", `/api/exams/${examId}/students`, null, adminToken);
    assert.equal(examStudents.response.status, 200);
    assert.equal(examStudents.json.data.students.length, 1);
    assert.equal(examStudents.json.data.students[0].track, "ND 2A");

    const studentsList = await request(baseUrl, "GET", "/api/admin/students", null, adminToken);
    assert.equal(studentsList.response.status, 200);
    const targetStudent = studentsList.json.data.students.find((s) => s.id === studentId);
    assert.ok(targetStudent, "Enrolled student should be in the list");
    assert.equal(targetStudent.examsCount, 1);

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

    // Verify completedSessions list on student exams
    const studentExams1 = await request(baseUrl, "GET", "/api/student/exams", null, studentToken);
    assert.equal(studentExams1.response.status, 200);
    const targetExam1 = studentExams1.json.data.exams.find((e) => e.id === examId);
    assert.ok(targetExam1);
    assert.equal(targetExam1.completedSessions.length, 1);

    // Start second attempt on the same exam
    const start2 = await request(baseUrl, "POST", `/api/student/exams/${examId}/start`, null, studentToken);
    assert.equal(start2.response.status, 200);
    const secondSessionId = start2.json.data.session.id;

    // Submit second attempt
    const submit2 = await request(baseUrl, "POST", `/api/exams/${examId}/submit`, {
      answers: [{ questionId, selectedOption: "B" }]
    }, studentToken);
    assert.equal(submit2.response.status, 200);

    // Verify both attempts exist
    const studentExams2 = await request(baseUrl, "GET", "/api/student/exams", null, studentToken);
    assert.equal(studentExams2.response.status, 200);
    const targetExam2 = studentExams2.json.data.exams.find((e) => e.id === examId);
    assert.equal(targetExam2.completedSessions.length, 2);

    // Review second attempt specifically
    const review2 = await request(baseUrl, "GET", `/api/student/exams/session/${secondSessionId}/review`, null, studentToken);
    assert.equal(review2.response.status, 200);
    assert.equal(review2.json.data.session.id, secondSessionId);

    // Test: De-enroll student (empty student list)
    const deenroll = await request(baseUrl, "POST", `/api/exams/${examId}/enroll`, {
      studentIds: []
    }, adminToken);
    assert.equal(deenroll.response.status, 200);

    // Check enrollment list is now empty
    const examStudentsAfter = await request(baseUrl, "GET", `/api/exams/${examId}/students`, null, adminToken);
    assert.equal(examStudentsAfter.response.status, 200);
    assert.equal(examStudentsAfter.json.data.students.length, 0);
  } finally {
    server.close();
    if (fs.existsSync(process.env.DATA_FILE)) fs.unlinkSync(process.env.DATA_FILE);
    if (fs.existsSync(baseUrl)) {
      try { fs.unlinkSync(baseUrl); } catch (e) {}
    }
  }
});
