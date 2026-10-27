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

The Azure steps below show how to get this URL.

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

## Deploy to Azure

This setup runs the Express API in Azure App Service and the Vite frontend in Azure Static Web Apps. The backend is deployed from GitHub Actions, configured through Azure Portal, and does not require Azure CLI. Application secrets stay in App Service settings and are not committed to the repository.

### 1. Prepare the database and frontend resource

In Supabase, run `Backend/sql/schema.sql` in the SQL Editor. Have the project URL and service-role key ready.

In Azure Portal, create a **Static Web App**. Select the Free plan, choose **Other** for the deployment source, and create it in the resource group and region you plan to use. Note its site URL, such as `https://<name>.azurestaticapps.net`; you will need it for the API's CORS setting. You will deploy the frontend in step 4.

### 2. Create the backend in Azure Portal

In Azure Portal, select **Create a resource** > **Web App**. On the Basics tab, select your subscription and resource group, enter a globally unique app name, choose **Code**, **Linux**, and the **Node 22 LTS** runtime. Choose a region and App Service plan that fit your budget. Select **Review + create**, then **Create**. App Service plans can incur charges; check the selected plan's pricing before creating it.

After creation, open the Web App and go to **Configuration** > **General settings**. Set the startup command to `npm start` and save. The app URL will be `https://<app-name>.azurewebsites.net` and its API base URL will be `https://<app-name>.azurewebsites.net/api`.

### 3. Add production settings and GitHub deployment

In the Web App, open **Configuration** > **Application settings** and add the settings below. Save the settings.

| Setting | Value | Store as |
| --- | --- | --- |
| `NODE_ENV` | `production` | Environment variable |
| `STORAGE_DRIVER` | `supabase` | Environment variable |
| `AI_PROVIDER` | `gemini` or `openai` | Environment variable |
| `TRUST_PROXY` | `true` | Environment variable |
| `CORS_ORIGIN` | Static Web App origin from step 1, with no path | App setting |
| `JWT_SECRET` | Random value, at least 32 characters | App setting |
| `ADMIN_EMAIL` | Your initial administrator email | App setting |
| `ADMIN_PASSWORD` | Strong password, at least 12 characters | App setting |
| `SUPABASE_URL` | Supabase project URL | App setting |
| `SUPABASE_SERVICE_KEY` | Supabase service-role key | App setting |
| `GEMINI_API_KEY` or `OPENAI_API_KEY` | Key for the provider selected above | App setting |

App Service provides `PORT` to the Node app, so do not add a `PORT` setting. Set `GEMINI_MODEL` or `OPENAI_MODEL` only if you need to override the defaults. App Service application settings are encrypted at rest. Keep the service-role key and AI key out of frontend settings.

The workflow uses a publish profile. In the Web App, open **Configuration** > **General settings**, set **SCM Basic Auth Publishing Credentials** to **On**, and save. Then return to **Overview** and select **Download publish profile**. This enables basic authentication for SCM deployment; keep the downloaded profile private and store it only as the GitHub secret below. In the GitHub repository, open **Settings** > **Secrets and variables** > **Actions** and add:

- A repository secret named `AZURE_WEBAPP_PUBLISH_PROFILE` with the downloaded publish profile contents.
- A repository variable named `AZURE_WEBAPP_NAME` with the exact Web App name.

The repository includes `.github/workflows/deploy-azure-backend.yml`, which deploys only the `Backend/` app to Azure. Commit that workflow to `main` if it is not already there. Its first run deploys the API; subsequent pushes to `Backend/` redeploy it automatically.

Wait for the GitHub Actions deployment to finish. Confirm `https://<app-name>.azurewebsites.net/api/health` returns a successful response.

### 4. Deploy the frontend

In the Static Web App, copy its deployment token from **Manage deployment token**.

Back in a terminal at the repository root, build the frontend with the API URL from step 2, install the Static Web Apps CLI if needed, then deploy the build output. The commands below ask for the deployment token without putting it in shell history. Do not commit or share it:

```bash
VITE_API_URL="https://<api-host>/api" npm run build
read -s "SWA_CLI_DEPLOYMENT_TOKEN?Paste deployment token: "
export SWA_CLI_DEPLOYMENT_TOKEN
printf '\n'
npx @azure/static-web-apps-cli deploy ./dist --env production
unset SWA_CLI_DEPLOYMENT_TOKEN
```

The frontend API URL is embedded at build time; rebuild and redeploy it whenever that URL changes.

### 5. Verify the deployment

Open the Static Web App URL and check admin login, student login, exam creation, enrollment, exam submission, and results. Confirm the API `/api/health` endpoint is healthy. For later frontend updates, repeat the build and deploy commands. For backend updates, push changes under `Backend/` to `main` and confirm the GitHub Actions run succeeds.

Azure resources can incur charges. To remove the resources created for this deployment when you no longer need them, delete them from their Overview pages in Azure Portal.
