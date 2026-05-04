# CBT Backend Frontend Integration Guide

This document is the frontend handoff for the CBT backend.

Base API URL for local development:

```js
const API_URL = 'http://localhost:3000/api';
```

The backend currently has no login/session middleware. The frontend must provide a stable `user_id` string when starting an exam. This can come from your auth system, local test user, or a generated user id during development.

## Backend Requirements

Before frontend integration, the backend must be running:

```bash
npm start
```

Health check:

```http
GET http://localhost:3000/api/health
```

Successful response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-04T00:00:00.000Z"
}
```

Environment variables expected by the backend:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_xxxxx
SUPABASE_ANON_KEY=sb_publishable_xxxxx

AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxx

PORT=3000
CORS_ORIGIN=http://localhost:5173
```

Set `CORS_ORIGIN` to the frontend dev server URL.

## Response Format

Most successful API responses use this shape:

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-05-04T00:00:00.000Z"
}
```

Most error responses use this shape:

```json
{
  "success": false,
  "message": "Error message",
  "timestamp": "2026-05-04T00:00:00.000Z"
}
```

Validation errors return:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field": "Validation detail"
  },
  "timestamp": "2026-05-04T00:00:00.000Z"
}
```

Common status codes:

```text
200 - Success
201 - Created
400 - Bad request
404 - Not found
422 - Validation failed
500 - Server error
```

## Main User Flow

Use this order in the frontend:

1. Upload PDF with `POST /pdf/upload`
2. Generate questions with `POST /questions/generate`
3. Start exam with `POST /exams/start`
4. Submit answers with `POST /exams/:examId/submit`
5. Show results with `GET /exams/:examId/results`

## API Client Helper

```js
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function apiFetch(path, options = {}) {
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
```

For Vite frontend projects, add:

```env
VITE_API_URL=http://localhost:3000/api
```

## Health

### Check Backend Health

```http
GET /health
```

Example:

```js
export async function checkHealth() {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}
```

## PDF Endpoints

### Upload PDF

```http
POST /pdf/upload
Content-Type: multipart/form-data
```

Request body:

```text
file: PDF file
```

Constraints:

```text
Only application/pdf files are accepted.
Maximum file size is 10MB.
```

Example:

```js
export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('file', file);

  const result = await apiFetch('/pdf/upload', {
    method: 'POST',
    body: formData
  });

  return result.data;
}
```

Success data:

```json
{
  "id": "pdf-uuid",
  "filename": "document.pdf",
  "file_size": 2048576,
  "num_pages": 45,
  "num_words": 12500,
  "status": "processed",
  "created_at": "2026-05-04T00:00:00.000Z"
}
```

Frontend should save `data.id` as `pdf_id`.

### List PDFs

```http
GET /pdf?page=1&limit=10
```

Example:

```js
export async function listPDFs(page = 1, limit = 10) {
  const result = await apiFetch(`/pdf?page=${page}&limit=${limit}`);
  return result.data;
}
```

Success data:

```json
{
  "pdfs": [
    {
      "id": "pdf-uuid",
      "filename": "document.pdf",
      "file_size": 2048576,
      "status": "processed",
      "created_at": "2026-05-04T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### Get PDF Details

```http
GET /pdf/:id
```

Example:

```js
export async function getPDF(pdfId) {
  const result = await apiFetch(`/pdf/${pdfId}`);
  return result.data;
}
```

Success data:

```json
{
  "id": "pdf-uuid",
  "filename": "document.pdf",
  "file_size": 2048576,
  "status": "processed",
  "created_at": "2026-05-04T00:00:00.000Z",
  "updated_at": "2026-05-04T00:00:00.000Z"
}
```

### Delete PDF

```http
DELETE /pdf/:id
```

Example:

```js
export async function deletePDF(pdfId) {
  const result = await apiFetch(`/pdf/${pdfId}`, {
    method: 'DELETE'
  });
  return result.data;
}
```

Success data:

```json
{
  "id": "pdf-uuid"
}
```

Deleting a PDF also deletes linked questions and exam sessions through database cascade rules.

## Question Endpoints

### Generate Questions

```http
POST /questions/generate
Content-Type: application/json
```

Request body:

```json
{
  "pdf_id": "pdf-uuid",
  "num_questions": 10,
  "difficulty": "medium"
}
```

Validation:

```text
pdf_id: required UUID
num_questions: number from 1 to 100, default 10
difficulty: easy | medium | hard, default medium
```

Example:

```js
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
```

Success data:

```json
{
  "generated": 10,
  "saved": 10,
  "questions": [
    {
      "id": "question-uuid",
      "pdf_id": "pdf-uuid",
      "question_text": "What is the main idea?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correct_answer": "A",
      "difficulty": "medium",
      "created_at": "2026-05-04T00:00:00.000Z"
    }
  ]
}
```

Note: generated question responses include `correct_answer`. Do not show it in the exam UI.

### Get Questions For PDF

```http
GET /questions/pdf/:pdfId?page=1&limit=10
```

Example:

```js
export async function getQuestionsByPDF(pdfId, page = 1, limit = 10) {
  const result = await apiFetch(`/questions/pdf/${pdfId}?page=${page}&limit=${limit}`);
  return result.data;
}
```

Success data:

```json
{
  "questions": [
    {
      "id": "question-uuid",
      "pdf_id": "pdf-uuid",
      "question_text": "What is the main idea?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correct_answer": "A",
      "difficulty": "medium",
      "created_at": "2026-05-04T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 10,
    "pages": 1
  }
}
```

### Get Single Question

```http
GET /questions/:questionId
```

Example:

```js
export async function getQuestion(questionId) {
  const result = await apiFetch(`/questions/${questionId}`);
  return result.data;
}
```

### Delete Questions For PDF

```http
DELETE /questions/pdf/:pdfId
```

Example:

```js
export async function deleteQuestionsByPDF(pdfId) {
  const result = await apiFetch(`/questions/pdf/${pdfId}`, {
    method: 'DELETE'
  });
  return result.data;
}
```

Success data:

```json
{
  "pdfId": "pdf-uuid"
}
```

## Exam Endpoints

### Start Exam

```http
POST /exams/start
Content-Type: application/json
```

Request body:

```json
{
  "user_id": "user123",
  "pdf_id": "pdf-uuid"
}
```

Validation:

```text
user_id: required string
pdf_id: required UUID
```

Example:

```js
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
```

Success data:

```json
{
  "exam_id": "exam-uuid",
  "user_id": "user123",
  "pdf_id": "pdf-uuid",
  "status": "active",
  "total_questions": 10,
  "questions": [
    {
      "id": "question-uuid",
      "question_text": "What is the main idea?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "difficulty": "medium"
    }
  ]
}
```

This is the safest endpoint to use for the exam screen because it does not return `correct_answer`.

### Get Exam

```http
GET /exams/:examId
```

Example:

```js
export async function getExam(examId) {
  const result = await apiFetch(`/exams/${examId}`);
  return result.data;
}
```

If the exam is still active, the response includes questions without correct answers.

### Submit Exam

```http
POST /exams/:examId/submit
Content-Type: application/json
```

Request body:

```json
{
  "answers": [
    {
      "question_id": "question-uuid",
      "user_answer": "A"
    }
  ]
}
```

Validation:

```text
answers: required array
question_id: required UUID
user_answer: required string, usually A | B | C | D
```

Example:

```js
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
```

Success data:

```json
{
  "exam_id": "exam-uuid",
  "score": 80,
  "percentage": 80,
  "correct_count": 8,
  "total_questions": 10,
  "status": "completed"
}
```

### Get Exam Results

```http
GET /exams/:examId/results
```

Example:

```js
export async function getExamResults(examId) {
  const result = await apiFetch(`/exams/${examId}/results`);
  return result.data;
}
```

Success data:

```json
{
  "id": "exam-uuid",
  "user_id": "user123",
  "pdf_id": "pdf-uuid",
  "status": "completed",
  "started_at": "2026-05-04T00:00:00.000Z",
  "completed_at": "2026-05-04T00:10:00.000Z",
  "score": 80,
  "total_questions": 10,
  "created_at": "2026-05-04T00:00:00.000Z"
}
```

If the exam is not completed, this endpoint returns `400` with:

```json
{
  "success": false,
  "message": "Exam not completed yet"
}
```

### Get User Exam History

```http
GET /exams/user/:userId?page=1&limit=10
```

Example:

```js
export async function getUserExamHistory(userId, page = 1, limit = 10) {
  const result = await apiFetch(`/exams/user/${userId}?page=${page}&limit=${limit}`);
  return result.data;
}
```

Success data:

```json
{
  "exams": [
    {
      "id": "exam-uuid",
      "user_id": "user123",
      "pdf_id": "pdf-uuid",
      "status": "completed",
      "started_at": "2026-05-04T00:00:00.000Z",
      "completed_at": "2026-05-04T00:10:00.000Z",
      "score": 80,
      "total_questions": 10,
      "created_at": "2026-05-04T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

Backend caveat: in the current route file, `/exams/user/:userId` is declared after `/exams/:examId`. If this endpoint returns "Exam not found", the backend route order needs to be fixed by placing `/user/:userId` above `/:examId`.

## Complete Frontend Service Module

```js
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
```

## UI Notes For The Frontend

Do not show `correct_answer` during the exam. Use the `questions` array returned by `POST /exams/start` for the exam UI.

Store answers as a map while the user is answering:

```js
const answersByQuestionId = {
  'question-uuid-1': 'A',
  'question-uuid-2': 'C'
};
```

Submit only after converting that map into the `answers` array shown above.

Recommended frontend states:

```text
idle
uploading_pdf
pdf_uploaded
generating_questions
questions_ready
starting_exam
exam_active
submitting_exam
exam_completed
error
```

Recommended screens:

```text
PDF upload screen
Question generation screen
Exam screen
Results screen
PDF/history management screen
```

## Known Backend Caveats

1. `GET /exams/user/:userId` may need route-order fix in `src/routes/exams.js`.
2. There is no auth middleware yet; `user_id` is trusted from the request body.
3. Question generation can take time because it calls the AI provider and may process PDF text in chunks.
4. Generated question endpoints return `correct_answer`; exam-start endpoints intentionally hide it.
5. The backend only accepts PDFs up to 10MB.
6. The frontend should call `/api/health`, not `/health`.
