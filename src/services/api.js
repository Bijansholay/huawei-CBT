const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'cbt_auth_token';
const USER_KEY = 'cbt_auth_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.message || `Request failed with ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export async function loginUser(credentials) {
  const body = credentials.role === 'admin'
    ? { email: credentials.email || credentials.matric, password: credentials.password }
    : { matricNumber: credentials.matricNumber || credentials.matric, surname: credentials.surname };

  const result = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  setSession(result.data);
  return result.data;
}

export async function logoutUser() {
  try {
    if (getToken()) {
      await apiFetch('/auth/logout', { method: 'POST' });
    }
  } finally {
    clearSession();
  }
}

export async function getCurrentUser() {
  const result = await apiFetch('/auth/me');
  setSession({ token: getToken(), user: result.data.user });
  return result.data.user;
}

export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('pdf', file);
  const result = await apiFetch('/pdf/upload', { method: 'POST', body: formData });
  return result.data;
}

export async function listPDFs() {
  const result = await apiFetch('/pdf');
  return result.data;
}

export async function getPDF(pdfId) {
  const result = await apiFetch(`/pdf/${pdfId}`);
  return result.data;
}

export async function deletePDF(pdfId) {
  const result = await apiFetch(`/pdf/${pdfId}`, { method: 'DELETE' });
  return result.data;
}

export async function createStudent(student) {
  const result = await apiFetch('/admin/students', {
    method: 'POST',
    body: JSON.stringify(student)
  });
  return result.data;
}

export async function listStudents() {
  const result = await apiFetch('/admin/students');
  return result.data;
}

export async function updateStudent(studentId, student) {
  const result = await apiFetch(`/admin/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(student)
  });
  return result.data;
}

export async function deleteStudent(studentId) {
  const result = await apiFetch(`/admin/students/${studentId}`, { method: 'DELETE' });
  return result.data;
}

export async function createExam(exam) {
  const result = await apiFetch('/exams', {
    method: 'POST',
    body: JSON.stringify(exam)
  });
  return result.data;
}

export async function listExams() {
  const result = await apiFetch('/exams');
  return result.data;
}

export async function updateExam(examId, exam) {
  const result = await apiFetch(`/exams/${examId}`, {
    method: 'PUT',
    body: JSON.stringify(exam)
  });
  return result.data;
}

export async function deleteExam(examId) {
  const result = await apiFetch(`/exams/${examId}`, { method: 'DELETE' });
  return result.data;
}

export async function enrollStudents(examId, studentIds) {
  const result = await apiFetch(`/exams/${examId}/enroll`, {
    method: 'POST',
    body: JSON.stringify({ studentIds })
  });
  return result.data;
}

export async function getExamStudents(examId) {
  const result = await apiFetch(`/exams/${examId}/students`);
  return result.data;
}

export async function createQuestion(question) {
  const result = await apiFetch('/questions', {
    method: 'POST',
    body: JSON.stringify(question)
  });
  return result.data;
}

export async function listQuestions(params = {}) {
  const query = new URLSearchParams();
  if (params.examId) query.set('examId', params.examId);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const result = await apiFetch(`/questions${suffix}`);
  return result.data;
}

export async function updateQuestion(questionId, question) {
  const result = await apiFetch(`/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(question)
  });
  return result.data;
}

export async function deleteQuestion(questionId) {
  const result = await apiFetch(`/questions/${questionId}`, { method: 'DELETE' });
  return result.data;
}

export async function deleteQuestionsBulk(questionIds) {
  const result = await apiFetch('/questions/delete-bulk', {
    method: 'POST',
    body: JSON.stringify({ ids: questionIds })
  });
  return result.data;
}

export async function generateQuestions(pdfId, count = 10, difficulty = 'medium', options = {}) {
  const result = await apiFetch('/questions/generate', {
    method: 'POST',
    body: JSON.stringify({
      pdfId,
      count,
      difficulty,
      typeCounts: options.typeCounts,
      difficultyCounts: options.difficultyCounts,
      examId: options.examId
    })
  });
  return result.data;
}

export async function generateQuestionsFromFile(file, count = 10, difficulty = 'medium', options = {}) {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('count', String(count));
  formData.append('difficulty', difficulty);
  if (options.typeCounts) formData.append('typeCounts', JSON.stringify(options.typeCounts));
  if (options.difficultyCounts) formData.append('difficultyCounts', JSON.stringify(options.difficultyCounts));
  if (options.examId) formData.append('examId', options.examId);

  const result = await apiFetch('/questions/generate', {
    method: 'POST',
    body: formData
  });

  return result.data;
}

export async function listAdmins() {
  const result = await apiFetch('/admin/admins');
  return result.data;
}

export async function createAdmin(admin) {
  const result = await apiFetch('/admin/admins', {
    method: 'POST',
    body: JSON.stringify(admin)
  });
  return result.data;
}

export async function updateAdmin(adminId, admin) {
  const result = await apiFetch(`/admin/admins/${adminId}`, {
    method: 'PUT',
    body: JSON.stringify(admin)
  });
  return result.data;
}

export async function deleteAdmin(adminId) {
  const result = await apiFetch(`/admin/admins/${adminId}`, { method: 'DELETE' });
  return result.data;
}

export async function listStudentExams() {
  const result = await apiFetch('/student/exams');
  return result.data;
}

export async function getStudentExam(examId) {
  const result = await apiFetch(`/student/exams/${examId}`);
  return result.data;
}

export async function startStudentExam(examId) {
  const result = await apiFetch(`/student/exams/${examId}/start`, { method: 'POST' });
  return result.data;
}

export async function getExam(examId) {
  const result = await apiFetch(`/exams/${examId}`);
  return result.data;
}

export async function submitExam(examId, answersByQuestionId) {
  const answers = Object.entries(answersByQuestionId).map(([questionId, answer]) => ({
    questionId,
    selectedOption: answer
  }));

  const result = await apiFetch(`/exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers })
  });

  return result.data;
}

export async function logExamViolation(examId, payload) {
  const token = getToken();
  const response = await fetch(`${API_URL}/student/exams/${examId}/violations`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    const error = new Error(result?.message || `Request failed with ${response.status}`);
    error.status = response.status;
    error.payload = result;
    throw error;
  }

  return result.data;
}

export async function getExamResults(examId) {
  const result = await apiFetch(`/exams/${examId}/results`);
  return result.data;
}

export async function getAdminResults() {
  const result = await apiFetch('/admin/results');
  return result.data;
}

export async function getAdminExamResults(examId) {
  const result = await apiFetch(`/admin/results/exam/${examId}`);
  return result.data;
}

export async function getExamReview(examId, sessionId = null) {
  const path = sessionId ? `/student/exams/session/${sessionId}/review` : `/student/exams/${examId}/review`;
  const result = await apiFetch(path);
  return result.data;
}

export async function getAdminSessionReview(sessionId) {
  const result = await apiFetch(`/admin/results/session/${sessionId}/review`);
  return result.data;
}

// Simulator Labs Integration APIs
export async function listLabs() {
  const result = await apiFetch('/labs');
  return result.data;
}

export async function createLab(payload) {
  const result = await apiFetch('/labs', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function deleteLab(labId) {
  const result = await apiFetch(`/labs/${labId}`, { method: 'DELETE' });
  return result.data;
}

export async function listLabEnrollments(labId) {
  const result = await apiFetch(`/labs/${labId}/enrollments`);
  return result.data;
}

export async function enrollInLab(labId, studentId) {
  const result = await apiFetch(`/labs/${labId}/enroll`, {
    method: 'POST',
    body: JSON.stringify({ studentId })
  });
  return result.data;
}

export async function unenrollFromLab(labId, studentId) {
  const result = await apiFetch(`/labs/${labId}/unenroll`, {
    method: 'POST',
    body: JSON.stringify({ studentId })
  });
  return result.data;
}

export async function listLabAttempts(labId) {
  const result = await apiFetch(`/labs/${labId}/attempts`);
  return result.data;
}

export async function getLabAttempt(attemptId) {
  const result = await apiFetch(`/labs/attempts/${attemptId}`);
  return result.data;
}

export async function submitLabAttempt(labId, payload) {
  const result = await apiFetch(`/labs/${labId}/submit`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return result.data;
}

export async function getLabDetails(labId) {
  const result = await apiFetch(`/labs/${labId}`);
  return result.data;
}
