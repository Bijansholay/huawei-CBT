# CBT Backend - AI-Powered Computer-Based Testing

Production-ready backend for generating AI-driven exam questions from PDFs.

## Quick Start (3 minutes)

### 1. Setup Environment
```bash
git clone <repo>
cd cbt-backend
cp .env.example .env
```

### 2. Configure .env
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
OPENAI_API_KEY=sk-...
PORT=3000
```

### 3. Install & Run
```bash
npm install
npm run dev
```

Visit `http://localhost:3000/api/health`

---

## Zero-Cost Deployment Options

### Option 1: Railway.app (Recommended)
**Cost**: Free tier includes $5/month credit (sufficient for low-traffic)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up
```

Railway automatically detects Node.js and provisions PostgreSQL.

### Option 2: Render.com
**Cost**: Free tier available

1. Push to GitHub
2. Connect Render dashboard
3. Create new Web Service
4. Set environment variables
5. Deploy

### Option 3: Heroku Alternative (Fly.io)
**Cost**: Generous free tier

```bash
# Install Fly CLI
curl https://fly.io/install.sh | sh

# Login and init
fly auth login
fly launch

# Deploy
fly deploy
```

### Option 4: Docker + Self-Hosted (Free)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package* .
RUN npm install --production
COPY src .
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t cbt-backend .
docker run -p 3000:3000 --env-file .env cbt-backend
```

---

## Architecture

```
cbt-backend/
├── src/
│   ├── config/           # External services (Supabase, OpenAI)
│   ├── controllers/      # Request handlers
│   ├── services/         # Business logic (PDF, AI, DB)
│   ├── routes/           # API endpoints
│   ├── middleware/       # Error handling, logging
│   ├── utils/            # Response formatting
│   └── app.js            # Express setup
├── server.js             # Entry point
└── package.json
```

**Key Design Principles:**
- Controllers: Handle HTTP logic only
- Services: Handle business logic (pure functions)
- Separation of concerns: Each file has one responsibility
- Async/await: No callback hell
- Error handling: Centralized middleware
- Input validation: Joi schemas

---

## API Endpoints

### PDF Management

#### Upload PDF
```http
POST /api/pdf/upload
Content-Type: multipart/form-data

file: <binary PDF>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "document.pdf",
    "file_size": 2048576,
    "num_pages": 45,
    "num_words": 12500,
    "status": "processed"
  }
}
```

#### Get PDF List
```http
GET /api/pdf?page=1&limit=10
```

#### Delete PDF
```http
DELETE /api/pdf/{pdfId}
```

---

### Question Generation

#### Generate Questions
```http
POST /api/questions/generate
Content-Type: application/json

{
  "pdf_id": "uuid",
  "num_questions": 20,
  "difficulty": "medium"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "generated": 20,
    "saved": 20,
    "questions": [
      {
        "id": "uuid",
        "pdf_id": "uuid",
        "question_text": "What is...",
        "options": {
          "A": "Option 1",
          "B": "Option 2",
          "C": "Option 3",
          "D": "Option 4"
        },
        "correct_answer": "A",
        "difficulty": "medium"
      }
    ]
  }
}
```

#### Get Questions by PDF
```http
GET /api/questions/pdf/{pdfId}?page=1&limit=10
```

---

### Exam Management

#### Start Exam
```http
POST /api/exams/start
Content-Type: application/json

{
  "user_id": "user123",
  "pdf_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exam_id": "uuid",
    "user_id": "user123",
    "total_questions": 20,
    "questions": [
      {
        "id": "uuid",
        "question_text": "...",
        "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
        "difficulty": "medium"
      }
    ]
  }
}
```

#### Submit Exam
```http
POST /api/exams/{examId}/submit
Content-Type: application/json

{
  "answers": [
    {
      "question_id": "uuid",
      "user_answer": "A"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "exam_id": "uuid",
    "score": 85,
    "percentage": 85,
    "correct_count": 17,
    "total_questions": 20,
    "status": "completed"
  }
}
```

#### Get Exam Results
```http
GET /api/exams/{examId}/results
```

#### Get User's Exam History
```http
GET /api/exams/user/{userId}?page=1&limit=10
```

---

## Database Schema

### Tables
- `pdfs`: Uploaded PDF documents
- `questions`: AI-generated questions
- `exam_sessions`: Exam attempts by users
- `exam_answers`: User's answers to questions

All with proper foreign keys and cascading deletes.

---

## Performance Considerations

1. **Text Chunking**: Large PDFs are split before AI processing
2. **Rate Limiting**: Delays between AI API calls to avoid throttling
3. **Pagination**: All list endpoints support pagination
4. **Indexing**: Database indexes on frequently queried fields
5. **Async/Await**: Non-blocking I/O throughout

---

## Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Stack trace (dev only)",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Bad request
- 404: Not found
- 422: Validation error
- 500: Server error

---

## Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# AI Provider
AI_PROVIDER=openai        # or 'gemini'
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Optional
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

---

## Next Steps

1. **Frontend Integration**: Use fetch/axios with the API
2. **Authentication**: Add JWT middleware (optional)
3. **Rate Limiting**: Use express-rate-limit for prod
4. **Caching**: Add Redis for question caching
5. **Monitoring**: Integrate Sentry for error tracking

---

## Support

- Supabase docs: https://supabase.com/docs
- OpenAI docs: https://platform.openai.com/docs
- Gemini docs: https://ai.google.dev/docs