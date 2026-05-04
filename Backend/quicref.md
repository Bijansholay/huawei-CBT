# CBT Backend - Quick Reference

## File Structure
```
src/
├── config/
│   ├── database.js (Supabase client + schema)
│   ├── supabase.js (Storage config)
│   └── ai.js (OpenAI/Gemini setup)
├── controllers/ (Request handlers)
│   ├── pdfController.js
│   ├── questionController.js
│   └── examController.js
├── services/ (Business logic)
│   ├── pdfService.js (Text extraction)
│   ├── aiService.js (Question generation)
│   ├── questionService.js (DB questions)
│   ├── examService.js (Exam logic)
│   └── validationService.js (Input validation)
├── routes/ (API endpoints)
│   ├── pdf.js
│   ├── questions.js
│   ├── exams.js
│   └── index.js
├── middleware/
│   └── errorHandler.js (Global error handling)
├── utils/
│   └── responses.js (JSON response formatting)
└── app.js (Express setup)
```

## Installation

```bash
# Clone and setup
git clone <your-repo>
cd cbt-backend
npm install

# Configure
cp .env.example .env
# Edit .env with your credentials

# Run
npm run dev      # Development
npm start        # Production
```

## Key Configuration

### Supabase Setup
1. Create account at supabase.com
2. Create new project
3. Get keys from Settings > API Keys
4. Create storage bucket named 'pdfs'
5. Configure RLS if needed

### OpenAI/Gemini
- OpenAI: Get key from platform.openai.com
- Gemini: Get key from ai.google.dev

### Environment
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_KEY=eyJxxxxx
OPENAI_API_KEY=sk-xxxxx
```

## Common Issues

### "PDF parsing failed"
**Cause**: Corrupted or scanned PDF
**Fix**: Try extracting text manually first

### "OPENAI_API_KEY not configured"
**Cause**: Missing environment variable
**Fix**: Check .env file and restart server

### "Database connection failed"
**Cause**: Invalid Supabase credentials
**Fix**: Verify SUPABASE_URL and SUPABASE_SERVICE_KEY

### "File too large"
**Cause**: PDF > 10MB
**Fix**: Increase limit in multer config if needed

### "No valid questions generated"
**Cause**: PDF has no extractable text
**Fix**: Use searchable PDF, not scanned image

## API Response Format

### Success
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* actual data */ },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "error": "Stack trace (dev only)",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "field": "error message" },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Testing Endpoints

### Using cURL
```bash
# Upload PDF
curl -X POST http://localhost:3000/api/pdf/upload \
  -F "file=@test.pdf"

# Generate questions
curl -X POST http://localhost:3000/api/questions/generate \
  -H "Content-Type: application/json" \
  -d '{"pdf_id":"uuid","num_questions":10}'

# Start exam
curl -X POST http://localhost:3000/api/exams/start \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user1","pdf_id":"uuid"}'
```

### Using Postman
1. Import API collection
2. Set environment variables ({{API_URL}}, {{PDF_ID}}, etc.)
3. Run requests in order

## Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Use strong CORS_ORIGIN
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Set up monitoring (Sentry)
- [ ] Configure logging
- [ ] Add authentication/JWT
- [ ] Test all endpoints
- [ ] Backup database regularly
- [ ] Set up CI/CD pipeline

## Performance Tips

1. **Chunking**: Large PDFs are auto-chunked before AI processing
2. **Caching**: Add Redis for question caching
3. **Pagination**: Always use pagination for list endpoints
4. **Indexes**: Database indexes are already set up
5. **Async**: All operations are non-blocking

## Scaling Strategy (Future)

Phase 1 (Current): Single backend + Supabase
Phase 2: Add Redis caching
Phase 3: Move to microservices (separate PDF, AI, Exam services)
Phase 4: Add job queue for async question generation

## Useful Supabase Queries

```sql
-- Get all questions for a PDF
SELECT * FROM questions WHERE pdf_id = 'uuid';

-- Get exam statistics
SELECT AVG(score), MAX(score), MIN(score), COUNT(*) 
FROM exam_sessions WHERE pdf_id = 'uuid';

-- Get user performance
SELECT pdf_id, AVG(score) as avg_score, COUNT(*) as exams_taken
FROM exam_sessions WHERE user_id = 'userid'
GROUP BY pdf_id;
```

## Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
NODE_DEBUG=express
```

Check Supabase logs:
- Dashboard > Logs > API requests
- Dashboard > Logs > Storage events

Monitor API:
- http://localhost:3000/api/health

## Support Resources

- Supabase: https://supabase.com/docs
- OpenAI: https://platform.openai.com/docs
- Gemini: https://ai.google.dev
- Express: https://expressjs.com
- PostgreSQL: https://www.postgresql.org/docs

## Next Steps

1. **Frontend**: Use INTEGRATION.md for React/Vue integration
2. **Auth**: Add JWT middleware (optional)
3. **Deployment**: Choose Railway, Render, or Fly
4. **Monitoring**: Integrate Sentry for errors
5. **Enhancement**: Add websockets for real-time progress