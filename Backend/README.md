# Huawei CBT Backend

Express backend for the Huawei CBT assessment portal.

## Features

- JWT-style signed token authentication
- Student login with matric number and surname
- Admin login with email and password
- Admin student management
- Admin exam management
- Student enrollment
- Student exam start, submit, and result lookup
- PDF upload metadata endpoint
- Question CRUD and placeholder question generation
- Supabase production storage
- File storage fallback for local development
- Production CORS, rate limiting, Helmet security headers, request IDs, and graceful shutdown

## Requirements

- Node.js 20+
- Supabase project for production storage

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`, then for local testing use:

```env
NODE_ENV=development
PORT=3000
STORAGE_DRIVER=file
JWT_SECRET=local-development-secret-at-least-32-characters
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin12345
CORS_ORIGIN=http://localhost:5173
```

Start the backend:

```bash
STORAGE_DRIVER=file npm start
```

Health checks:

```text
GET http://localhost:3000/api/health
GET http://localhost:3000/api/ready
```

## Production Setup

Run `sql/schema.sql` in the Supabase SQL Editor before deploying.

Set these production environment variables:

```env
NODE_ENV=production
PORT=3000
STORAGE_DRIVER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
JWT_TTL_SECONDS=86400
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-strong-admin-password
CORS_ORIGIN=https://your-frontend-domain.com
TRUST_PROXY=true
BODY_LIMIT=1mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

Production command:

```bash
npm run start:prod
```

The server will refuse to start in production if required secrets, CORS origin, or Supabase settings are missing.

## Default Admin

The first admin user is seeded automatically when storage is empty.

For local development, if you use the sample values:

```json
{
  "email": "admin@example.com",
  "password": "admin12345"
}
```

Use a strong `ADMIN_PASSWORD` in production.

## API Response Shape

Successful responses:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Failed responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": null
}
```

## Main Endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Admin exams:

- `POST /api/exams`
- `GET /api/exams`
- `GET /api/exams/:id`
- `PUT /api/exams/:id`
- `DELETE /api/exams/:id`
- `POST /api/exams/:id/enroll`
- `GET /api/exams/:id/students`

Admin students:

- `GET /api/admin/students`
- `POST /api/admin/students`
- `PUT /api/admin/students/:id`
- `DELETE /api/admin/students/:id`

Admin results:

- `GET /api/admin/results`
- `GET /api/admin/results/exam/:examId`

Student exams:

- `GET /api/student/exams`
- `GET /api/student/exams/:id`
- `POST /api/student/exams/:id/start`
- `POST /api/exams/:examId/submit`
- `GET /api/exams/:examId/results`

PDF and questions:

- `GET /api/pdf`
- `POST /api/pdf/upload`
- `GET /api/pdf/:id`
- `DELETE /api/pdf/:id`
- `GET /api/questions`
- `POST /api/questions`
- `POST /api/questions/generate`
- `PUT /api/questions/:id`
- `DELETE /api/questions/:id`

## Test

```bash
npm test
```

The integration test uses `STORAGE_DRIVER=file` and exercises login, student creation, exam creation, enrollment, student start, submit, and admin results.

## Deploy Checklist

1. Run `sql/schema.sql` in Supabase.
2. Set all production environment variables.
3. Deploy backend.
4. Confirm `/api/health` and `/api/ready`.
5. Set frontend `VITE_API_URL` to this backend’s `/api` URL.
6. Deploy frontend.
7. Test admin login, student login, exam creation, enrollment, exam submission, and results.
