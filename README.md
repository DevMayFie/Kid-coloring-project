# Children's Coloring Book Generator (ColorKid)

A family-friendly, privacy-first web application that generates personalized, printable children's coloring books with custom covers, customizable page counts, themed story adventures, fun facts, and PDF export.

---

## 🚨 Production Deployment Architecture & Storage Model

### 1. Cloud Run Single-Instance Requirement (`--max-instances=1`)

> **CRITICAL REQUIREMENT:** When using the default file-based storage, this application **MUST** be deployed to Google Cloud Run with **`--max-instances=1`** (and `SINGLE_INSTANCE="true"` or `CLOUD_RUN_MAX_INSTANCES="1"`).

#### Why Single-Instance is Enforced:
- The daily AI budget circuit breaker and anonymous session quota tracker are backed by local file stores (`.ai-budget-state.json` and `.ai-quota-state.json`) via `FileBudgetStore` and `FileQuotaStore`.
- In serverless environments like Google Cloud Run, each container replica has an isolated, ephemeral in-container filesystem.
- If the application were deployed with multiple instances (`max-instances > 1`), each replica would maintain its own independent budget reservation and quota file. This would multiply your effective AI spend across replicas and allow total daily spending to exceed your intended cap.
- Production startup enforces this constraint: the server will fail to start immediately if file-based stores are used without explicit single-instance configuration (`SINGLE_INSTANCE="true"` or `CLOUD_RUN_MAX_INSTANCES="1"`), or if `AI_MULTI_INSTANCE_DEPLOYMENT="true"` is set.

#### Storage & Concurrency Realities of File-Based Stores:
1. **Atomic Rename is Not a Distributed Transaction or Mutex**:
   - The file stores employ a temporary-file replacement pattern (`fs.writeFileSync` to a temp file followed by `fs.renameSync` over the target path) to prevent partially written or corrupt JSON files in the event of an abrupt process crash.
   - However, temporary-file replacement and rename are **not**, by themselves, a distributed atomic transaction, nor are they a cross-process read-modify-write lock. If multiple concurrent processes attempt to read, compute, and write state to the same file, uncoordinated writes can overwrite each other.
2. **Ephemeral Cloud Run Filesystem**:
   - Local filesystem storage on Google Cloud Run is **ephemeral** and **must not** be described or relied upon as guaranteed durable storage across container restarts or instance replacement.
   - When Cloud Run recycles a container instance, deploys a revision, or starts up after scaling to zero, files stored in the container's local writable layer are reset.
3. **Single-Instance Does Not Guarantee Durability Across Replacement**:
   - Setting `--max-instances=1` restricts concurrency to a single active replica to avoid budget multiplication across parallel containers. However, **setting the maximum instance count to one is not a guarantee that stored state will survive instance replacement or restarts**.
4. **Limitations for Multi-Instance and Concurrent Processes**:
   - File-based stores cannot synchronize state across multiple server instances or independent processes. They are strictly suited for single-instance, single-process deployments where budget tracking can tolerate ephemeral resets upon instance recreation.
5. **Recommended Direction for Durability and Multi-Instance Scaling**:
   - When stronger persistence or multi-instance horizontal scaling is required, a **durable shared storage solution with appropriate atomic update and concurrency guarantees** (such as PostgreSQL / Google Cloud SQL with ACID transactions, or Memorystore / Redis with atomic commands/scripts) is the recommended architectural direction.
   - The codebase provides pluggable interfaces (`setBudgetStore()` and `setQuotaStore()`), but external shared storage drivers have not been implemented out of the box and would need to be implemented before increasing `max-instances`.

#### Cloud Run Deployment Command:
When deploying via the Google Cloud CLI with file-based stores, always specify `--max-instances 1` and provide the required environment variables:
```bash
gcloud run deploy colorkid-studio \
  --image gcr.io/YOUR_PROJECT_ID/colorkid:latest \
  --platform managed \
  --region us-central1 \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 80 \
  --set-env-vars SINGLE_INSTANCE="true",NODE_ENV="production",CONSENT_SECRET="YOUR_MINIMUM_32_CHAR_HMAC_SECRET"
```

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
| `SINGLE_INSTANCE` | **Yes (in prod with file stores)** | `false` | Set to `true` (or `CLOUD_RUN_MAX_INSTANCES=1`) to confirm single-instance configuration when using file-based stores. Server fails immediately on production startup if unset when file stores are active. |
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
Executes the comprehensive 47-test integration suite covering budget circuit breakers, session quotas, parental consent tokens, route-level security, and startup verification.

### Build for Production
```bash
npm run build
npm start
```
Compiles client assets with Vite into `dist/` and bundles `server.ts` into `dist/server.cjs`.
