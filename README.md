# Children's Coloring Book Generator (ColorKid)

A family-friendly, privacy-first web application that generates personalized, printable children's coloring books with custom covers, customizable page counts, themed story adventures, fun facts, and PDF export.

---

## 🚨 Production Deployment Architecture & Cloud Run Requirements

### 1. Cloud Run Single-Instance Requirement (`--max-instances=1`)

> **CRITICAL REQUIREMENT:** This application **MUST** be deployed to Google Cloud Run with **`--max-instances=1`**.

#### Why Single-Instance is Mandatory:
- The daily AI budget circuit breaker and anonymous session quota tracker are backed by local file stores (`.ai-budget-state.json` and `.ai-quota-state.json`).
- In serverless environments like Google Cloud Run, each container replica has an isolated, ephemeral in-container filesystem.
- If the application scales to multiple instances (`max-instances > 1`), each instance maintains its own independent budget reservation and quota file. This would multiply your effective AI spend across replicas and allow total daily spending to exceed your intended daily cap.
- Running with `--max-instances=1` ensures that all requests pass through a single container instance, guaranteeing that the file-based atomic budget locks, reservation expirations, and session quota limits remain strictly authoritative.

#### Cloud Run Deployment Command:
When deploying via the Google Cloud CLI, always specify `--max-instances 1`:
```bash
gcloud run deploy colorkid-studio \
  --image gcr.io/YOUR_PROJECT_ID/colorkid:latest \
  --platform managed \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 80 \
  --set-env-vars SINGLE_INSTANCE="true",NODE_ENV="production"
```

#### Scaling Beyond a Single Instance:
If you need multi-replica horizontal scaling in the future, you must replace the local `FileBudgetStore` and `FileQuotaStore` with shared distributed atomic stores (such as PostgreSQL / Google Cloud SQL or Memorystore / Redis) using `setBudgetStore()` and `setQuotaStore()` before increasing `max-instances`.

---

### 2. Google Cloud Billing Budgets & Spending Caps Must Be Set Separately

> **IMPORTANT:** In-app budget circuit breakers provide defensive application-level protection, but **they do NOT replace cloud infrastructure billing controls**.

To guarantee that your cloud costs cannot exceed unexpected thresholds under any circumstance (such as rapid traffic spikes or network retries), you **must configure billing budgets and API caps in the Google Cloud Console**:

1. **Google Cloud Billing Budget & Alerts**:
   - Navigate to **Google Cloud Console > Billing > Budgets & alerts**.
   - Create a budget for your project (e.g., \$50.00/month or your desired threshold).
   - Configure alert thresholds (e.g., 50%, 90%, and 100% of budget) sent via email or Cloud Monitoring notifications.
   - *(Optional)* Configure programmatic notification channels (Cloud Pub/Sub) to disable billing or stop services if the budget is reached.

2. **Gemini API Quotas & Rate Limits**:
   - Navigate to **Google Cloud Console > IAM & Admin > Quotas & System Limits**.
   - Filter by **Generative Language API** (or Vertex AI Gemini API).
   - Set requests-per-minute (RPM) and tokens-per-minute (TPM) limits appropriate for your organization to enforce hard caps at the API gateway layer.

---

## ⚙️ Environment Variables

Configure the following environment variables in your deployment environment or `.env` file:

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key used for generating coloring pages, covers, and story ideas. |
| `CONSENT_SECRET` | **Yes (outside dev)** | Auto-generated in dev | 32+ character HMAC secret key used to sign parental consent acknowledgment tokens. Server refuses to start outside development if missing. |
| `SINGLE_INSTANCE` | Recommended | `false` | Set to `true` (or `CLOUD_RUN_MAX_INSTANCES=1`) to confirm single-instance deployment and silence startup warnings. |
| `ADMIN_KEY` | Optional | — | Secret key required to access administrative telemetry endpoints (`/api/admin/usage-budget` and `/api/admin/usage-trends`). When unset, admin routes return 404. Never use default or development keys. |
| `AI_DAILY_BUDGET_USD` | Optional | `50.00` | Daily USD spending limit for AI generation requests before the circuit breaker trips. |
| `ENABLE_PHOTO_TO_LINE_ART` | Optional | `false` | Feature flag for photo upload & line-art conversion. Disabled by default; set to `true` to enable. |
| `NODE_ENV` | Optional | `development` | Environment mode. When anything other than `development`, strict CSP and production security enforcement apply. |

---

## 🛠️ Local Development & Testing

### Installation
```bash
npm install
```

### Run Local Development Server
```bash
npm run dev
```
Starts the full-stack server on `http://localhost:3000` with Vite middleware mounted for hot module reloading.

### Run Production Readiness Test Suite
```bash
npm test
```
Executes the comprehensive 42+ test integration suite covering budget circuit breakers, session quotas, parental consent tokens, route-level security, and startup verification.

### Build for Production
```bash
npm run build
npm start
```
Compiles client assets with Vite into `dist/` and bundles `server.ts` into `dist/server.cjs`.
