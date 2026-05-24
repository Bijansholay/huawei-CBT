# Huawei CBT Frontend

React + Vite frontend for the Huawei CBT assessment portal.

## Features

- Student login with matric number and surname
- Admin login with email and password
- Student dashboard, exam page, and result page
- Admin dashboard, student management, exam management, question bank, and results views
- API token storage in `localStorage`
- Authenticated requests to the Express backend

## Requirements

- Node.js 20+
- Backend running locally or deployed

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

Start the frontend:

```bash
npm run dev
```

The Vite dev server will print the local URL, usually `http://localhost:5173`.

## Backend

The backend lives in `Backend/`.

For local frontend testing, start it from the backend folder:

```bash
cd Backend
STORAGE_DRIVER=file npm start
```

For production, deploy the backend first and set:

```env
VITE_API_URL=https://your-backend-domain.com/api
```

An example production env file is included at `.env.production.example`.

## Build

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Auth Flow

Admin login sends:

```json
{
  "email": "admin@example.com",
  "password": "admin-password"
}
```

Student login sends:

```json
{
  "matricNumber": "CST/2021/001",
  "surname": "Adeleke"
}
```

On successful login, the frontend stores:

- `cbt_auth_token`
- `cbt_auth_user`

API requests include:

```http
Authorization: Bearer <token>
```

## Deploy Checklist

1. Deploy the backend and confirm `/api/health` works.
2. Set `VITE_API_URL` to the deployed backend URL.
3. Run `npm run build`.
4. Deploy the generated `dist/` folder using Vercel, Netlify, Render static site, or another static host.
5. Confirm admin login, student login, exam creation, enrollment, exam submission, and results.
