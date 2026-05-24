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

export async function enrollStudents(examId, studentIds) {
  const result = await apiFetch(`/exams/${examId}/enroll`, {
    method: 'POST',
    body: JSON.stringify({ studentIds })
  });
  return result.data;
}

export async function createQuestion(question) {
  const result = await apiFetch('/questions', {
    method: 'POST',
    body: JSON.stringify(question)
  });
  return result.data;
}

export async function generateQuestions(examId, count = 10) {
  const result = await apiFetch('/questions/generate', {
    method: 'POST',
    body: JSON.stringify({ examId, count })
  });
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
