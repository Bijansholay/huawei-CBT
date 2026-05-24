# Huawei CBT Backend

Express backend rebuilt to match `FRONTEND_INTEGRATION_GUIDE.md`.

## Run

```bash
npm start
```

For development frontend integration:

```env
VITE_API_URL=http://localhost:3000/api
```

For frontend production deployment, set this in the frontend host:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

Default admin login:

```json
{
  "email": "admin@example.com",
  "password": "admin12345"
}
```

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` in `.env` for real use.

## Production

Copy `.env.example` to `.env` and set real values before running with `NODE_ENV=production`.

Required production settings:

- `JWT_SECRET`: at least 32 characters
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`: at least 12 characters
- `CORS_ORIGIN`: your deployed frontend URL, for example `https://your-frontend.vercel.app`
- `STORAGE_DRIVER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

Before deployment, run [sql/schema.sql](./sql/schema.sql) in the Supabase SQL editor. The app will load and persist data through Supabase when `STORAGE_DRIVER=supabase`.

Production command:

```bash
npm run start:prod
```

Health checks:

- `GET /api/health`
- `GET /api/ready`

For local-only development, you can set `STORAGE_DRIVER=file` to use `DATA_FILE`.

## Main Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/exams`
- `GET /api/exams`
- `GET /api/exams/:id`
- `PUT /api/exams/:id`
- `DELETE /api/exams/:id`
- `POST /api/exams/:id/enroll`
- `GET /api/exams/:id/students`
- `GET /api/admin/students`
- `POST /api/admin/students`
- `PUT /api/admin/students/:id`
- `DELETE /api/admin/students/:id`
- `GET /api/admin/results`
- `GET /api/admin/results/exam/:examId`
- `GET /api/student/exams`
- `GET /api/student/exams/:id`
- `POST /api/student/exams/:id/start`
- `POST /api/exams/:examId/submit`
- `GET /api/exams/:examId/results`

Responses use:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```
