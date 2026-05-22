const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiFetch('/pdf/upload', { method: 'POST', body: formData });
  return result.data;
}

export async function listPDFs(page = 1, limit = 10) {
  const result = await apiFetch(`/pdf?page=${page}&limit=${limit}`);
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

export async function generateQuestions(pdfId, numQuestions = 10, difficulty = 'medium') {
  const result = await apiFetch('/questions/generate', {
    method: 'POST',
    body: JSON.stringify({
      pdf_id: pdfId,
      num_questions: numQuestions,
      difficulty
    })
  });
  return result.data;
}

export async function getQuestionsByPDF(pdfId, page = 1, limit = 10) {
  const result = await apiFetch(`/questions/pdf/${pdfId}?page=${page}&limit=${limit}`);
  return result.data;
}

export async function startExam(userId, pdfId) {
  const result = await apiFetch('/exams/start', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      pdf_id: pdfId
    })
  });
  return result.data;
}

export async function getExam(examId) {
  const result = await apiFetch(`/exams/${examId}`);
  return result.data;
}

export async function submitExam(examId, answersByQuestionId) {
  const answers = Object.entries(answersByQuestionId).map(([questionId, answer]) => ({
    question_id: questionId,
    user_answer: answer
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

export async function getUserExamHistory(userId, page = 1, limit = 10) {
  const result = await apiFetch(`/exams/user/${userId}?page=${page}&limit=${limit}`);
  return result.data;
}
