# Huawei CBT Backend

Express API for the Huawei CBT assessment portal.

## How The Frontend Talks To It

The frontend developer should call the deployed backend over HTTP, not a local path.

Use this in the frontend:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

If the backend is deployed on AWS Lightsail, the public URL will look like:

```text
https://your-lightsail-domain-or-ip
```

So the frontend API base becomes:

```text
https://your-lightsail-domain-or-ip/api
```

For browser requests to work, the backend must allow the frontend origin:

```env
CORS_ORIGIN=https://your-frontend-domain.com
```

You can allow more than one origin with commas:

```env
CORS_ORIGIN=https://your-frontend-domain.com,https://staging-frontend-domain.com
```

Protected endpoints need:

```http
Authorization: Bearer <token>
```

The token comes from `POST /api/auth/login`.

## Requirements

- Node.js 22+
- Supabase project for production storage
- AI provider API key for question generation

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env` from `.env.example`.

For local testing:

```env
NODE_ENV=development
PORT=3000
STORAGE_DRIVER=file
JWT_SECRET=local-development-secret-at-least-32-characters
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin12345
CORS_ORIGIN=http://localhost:5173
OPENAI_API_KEY=your-openai-api-key
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

Set these production variables:

```env
NODE_ENV=production
PORT=3000
STORAGE_DRIVER=supabase
AI_PROVIDER=gemini
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
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

Production command:

```bash
npm run start:prod
```

The server refuses to start in production if required secrets, CORS origin, or Supabase settings are missing.

## AWS Lightsail Deployment

This backend is containerized already, so it can run on an AWS Lightsail Container Service without code changes.

Use the following environment variables in Lightsail:

- `AI_PROVIDER`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CORS_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

Keep these values in the Lightsail service, not in the repo. The service should run from `Backend/` with the included Dockerfile and expose `/api/health` for health checks.

## GitHub Actions CI/CD

This repo includes a push-to-deploy workflow at [`../.github/workflows/deploy-lightsail.yml`](../.github/workflows/deploy-lightsail.yml).

The workflow expects these GitHub repository secrets:

- `AWS_ROLE_TO_ASSUME`
- `AWS_REGION`
- `LIGHTSAIL_SERVICE_NAME`
- `AI_PROVIDER`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `CORS_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_MODEL` if you want to override the default model
- `GEMINI_MODEL` if you want to override the default model

Before the first push, create the Lightsail container service in the AWS console and make sure its name matches `LIGHTSAIL_SERVICE_NAME`.

On every push to `main`, the workflow:

- Installs backend dependencies
- Runs the backend test suite
- Builds the Docker image from `Backend/`
- Pushes the image to your Lightsail container service
- Creates a new Lightsail deployment pointing at `/api/health`

For GitHub Actions, the role-based path is the better choice because AWS roles use temporary credentials instead of long-term access keys: [IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html). AWS also recommends temporary credentials over IAM users with long-term credentials for federated access: [IAM users](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users.html).

## Response Shape

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Error message",
  "errors": null
}
```

## Authentication

Student login:

```json
{
  "matricNumber": "CST/2021/001",
  "surname": "Adeleke"
}
```

When creating or editing a student, you can also set `track` to group them by class or programme for easier exam enrollment.

Admin login:

```json
{
  "email": "admin@example.com",
  "password": "admin-password"
}
```

Login returns:

```json
{
  "user": { "...": "..." },
  "token": "signed-token"
}
```

## Endpoint Reference

### System

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Service status |
| `GET` | `/api/health` | Basic health check |
| `GET` | `/api/ready` | Readiness check and active storage driver |

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create a student account |
| `POST` | `/api/auth/login` | Login student or admin |
| `POST` | `/api/auth/logout` | Logout current session on the client |
| `GET` | `/api/auth/me` | Get the current authenticated user |

### Admin: Students

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/students` | List all students |
| `POST` | `/api/admin/students` | Create a student |
| `PUT` | `/api/admin/students/:id` | Update a student |
| `DELETE` | `/api/admin/students/:id` | Delete a student |

### Admin: Admin Accounts

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/admins` | List all admin accounts |
| `POST` | `/api/admin/admins` | Create another admin |
| `PUT` | `/api/admin/admins/:id` | Update an admin |
| `DELETE` | `/api/admin/admins/:id` | Delete an admin |

### Admin: Results

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/results` | List all completed exam results |
| `GET` | `/api/admin/results/exam/:examId` | Results for one exam |

### Admin: Exams

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/exams` | List all exams |
| `POST` | `/api/exams` | Create an exam |
| `GET` | `/api/exams/:id` | Get an exam and its questions |
| `PUT` | `/api/exams/:id` | Update an exam |
| `DELETE` | `/api/exams/:id` | Delete an exam |
| `POST` | `/api/exams/:id/enroll` | Enroll students into an exam |
| `GET` | `/api/exams/:id/students` | List enrolled students |
| `POST` | `/api/exams/:examId/submit` | Submit student answers |
| `GET` | `/api/exams/:examId/results` | Get results for an exam |

### Student

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/student/exams` | List exams assigned to the current student |
| `GET` | `/api/student/exams/:id` | Get one assigned exam with questions |
| `POST` | `/api/student/exams/:id/start` | Start an exam session |

### PDF

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/pdf` | List uploaded PDFs |
| `POST` | `/api/pdf/upload` | Upload a PDF for AI generation |
| `GET` | `/api/pdf/:id` | Get one PDF record |
| `DELETE` | `/api/pdf/:id` | Delete a PDF record |

### Questions

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/questions` | List questions, optionally filtered by `examId` |
| `POST` | `/api/questions` | Create one question manually |
| `POST` | `/api/questions/generate` | Generate questions from an uploaded PDF using the configured AI provider |
| `PUT` | `/api/questions/:id` | Update a question |
| `DELETE` | `/api/questions/:id` | Delete a question |

## AI Question Generation

Upload a PDF first with `POST /api/pdf/upload`.

Example request:

```json
{
  "pdfId": "pdf-uuid",
  "count": 10,
  "difficulty": "medium",
  "typeCounts": {
    "single": 7,
    "multiple": 2,
    "trueFalse": 1
  },
  "difficultyCounts": {
    "easy": 2,
    "medium": 6,
    "hard": 2
  }
}
```

If you include `examId`, the questions are saved to that exam. Without `examId`, the API returns preview questions only.

## Notes For The Frontend Developer

- Set `VITE_API_URL` to the deployed backend `/api` URL.
- Store the returned token after login.
- Send the token in `Authorization: Bearer <token>`.
- Call admin endpoints only with an admin token.
- Call student endpoints only with a student token.
- For PDF upload, send `FormData` with field name `pdf`.

## Test

```bash
npm test
```

The integration test covers login, student creation, exam creation, enrollment, student start, submit, and admin results.

## Deploy Checklist

1. Run `sql/schema.sql` in Supabase.
2. Set production env vars in Cloud Run.
3. Deploy backend.
4. Confirm `/api/health` and `/api/ready`.
5. Give the frontend developer the deployed backend `/api` URL.
6. Set frontend `VITE_API_URL` to that URL.
7. Deploy frontend.
8. Confirm login, exam flow, PDF upload, AI generation, and admin management.
