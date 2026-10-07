# PolyDesk 🌐⚡

**PolyDesk** is an AI-powered, multilingual customer support inbox that enables customer service teams to communicate effortlessly with global users across languages without requiring bilingual support agents. Customers submit inquiries in their native language (e.g., Spanish, Arabic, Dutch, French), and PolyDesk automatically classifies urgency and topic, generates English summaries, translates conversation threads on demand into each agent's preferred language, and translates outbound agent replies back into the customer's language in real time.

---

## Features

- 🌍 **Real-Time Multilingual Classification & Translation**: Inbound tickets are automatically detected for language, categorized by topic (`billing`, `technical`, `delivery`, `account`, `feedback`, `other`), scored for urgency (`low`, `normal`, `high`, `critical`), and summarized in concise English.
- 👤 **Per-Agent Language Preferences**: Each support agent configures their preferred language (English, Spanish, Arabic, French, Dutch, German, etc.). The interface dynamically translates message threads into the agent's language while retaining access to the customer's original text.
- 🔄 **Bidirectional Outbound Translation**: Agents draft replies in their native language; PolyDesk automatically translates the message into the customer's language before delivery and stores both formats.
- ⚡ **Live WebSocket Updates**: Instant bi-directional communication via Socket.io broadcasts new tickets and AI classification updates across all connected agents in real time without manual polling.
- 🛡️ **JWT Authentication & Role Protection**: Secure agent registration and login with bcrypt password hashing, JSON Web Tokens, and NestJS route guards.
- 🚦 **Rate Limiting & Resilient Retries**: Global endpoint throttling (`@nestjs/throttler`) combined with exponential backoff and timeout guards on NVIDIA AI API requests.
- 📊 **AI Observability & Admin Telemetry**: Dedicated administrative dashboard tracking aggregate LLM usage, success rates, average latency in milliseconds, model distribution, and error traces.
- 🌱 **Realistic Multilingual Seed Script**: Pre-configured database seeder with authentic support tickets across 5 different languages queued directly for AI processing.

---

## Tech Stack

### Backend
- **Framework**: [NestJS 12](https://nestjs.com/) (Node.js TypeScript runtime)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM 5](https://www.prisma.io/)
- **Job Queue**: [BullMQ 6](https://docs.bullmq.io/) with [Redis](https://redis.io/) (`ioredis`)
- **Real-Time WebSockets**: [Socket.io 4](https://socket.io/) via `@nestjs/platform-socket.io` and `@nestjs/websockets`
- **Authentication**: [Passport.js](http://www.passportjs.org/) & [JWT](https://jwt.io/) (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`)
- **Resilience & Health**: `@nestjs/throttler` (rate limiting) and `@nestjs/terminus` (system health checks)
- **Testing & Quality**: [Vitest 4](https://vitest.dev/) and [Oxlint](https://oxc.rs/)

### Frontend
- **Library**: [React 19](https://react.dev/) with [Vite 8](https://vitejs.dev/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Networking & Real-Time**: [Axios](https://axios-http.com/) and [Socket.io Client 4](https://socket.io/docs/v4/client-api/)

### Infrastructure & AI
- **LLM Foundation**: [NVIDIA NIM / Foundation Endpoints](https://build.nvidia.com/)
  - **Triage & Classification**: `nvidia/llama-3.3-nemotron-super-49b-v1.5`
  - **Translation & Fallback**: `meta/llama-3.2-11b-vision-instruct`

---

## Architecture & Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant API as NestJS API (/tickets)
    participant DB as PostgreSQL (Prisma)
    participant Queue as Redis (BullMQ)
    participant Worker as MessageProcessor Worker
    participant AI as NVIDIA AI Foundation
    participant WS as Socket.io Gateway
    actor Agent as Support Agent (React UI)

    Customer->>API: POST /tickets (Message in foreign language)
    API->>DB: Save Customer, Ticket (aiStatus: pending), Inbound Message
    API->>Queue: Enqueue message job to 'message-processing'
    API-->>WS: Broadcast 'ticket:created'
    WS-->>Agent: New ticket appears in inbox

    Queue->>Worker: Dequeue job
    Worker->>AI: Classify message (Language, Topic, Urgency, Summary)
    AI-->>Worker: JSON Classification Result
    Worker->>DB: Update Ticket attributes & aiStatus: 'done'
    Worker-->>WS: Broadcast 'ticket:updated'
    WS-->>Agent: Ticket badge, urgency, & summary update live

    Agent->>API: GET /tickets/:id/translated?lang=en
    API->>AI: (Optional) Translate thread into agent's language
    AI-->>API: Translated text
    API-->>Agent: Return messages with computed displayText
```

> 📖 **Full System Design**: For an in-depth component diagram and lifecycle breakdown, see [docs/architecture.md](docs/architecture.md).

---

## Key Technical Decisions

### 1. Asynchronous Queue-Backed AI Processing
AI inference with external LLMs introduces non-deterministic latency (500ms–3000ms+). Processing classification synchronously in the HTTP request handler would degrade API throughput and leave end users waiting. In PolyDesk, `POST /tickets` immediately persists the raw ticket and delegates AI triage to a BullMQ worker over Redis. Once the worker finishes, results are stored in PostgreSQL and pushed live to agents over WebSockets, guaranteeing high availability and sub-50ms API response times.

### 2. Automated Model Deprecation & Fallback Strategy
During development, upstream foundation models on the NVIDIA API occasionally reached End-Of-Life (EOL) or returned `410 Gone` / `404 Not Found`. Rather than crashing the triage pipeline, `NvidiaClientService` inspects HTTP response statuses; if the primary model is unavailable, it automatically switches to an active fallback model (`meta/llama-3.2-11b-vision-instruct`), logs the transition, and executes the request seamlessly.

### 3. Translation Quality Guard & Echoing Bug Fix
When translating certain non-Latin scripts (such as Arabic or short phrases), general-purpose LLMs occasionally echoed the input text back unchanged instead of translating it into the target language. To fix this, `TranslatorService` implements a Levenshtein distance string similarity check. If the returned translation has $\ge 90\%$ character overlap with the source text and the target language differs from the source, the service automatically triggers a one-time targeted retry with an explicit system prompt before returning.

### 4. Dynamic Per-Agent Translation vs. Static English Storage
Support teams are diverse and rarely all operate in English. Instead of statically converting every customer message into English at ingest time, PolyDesk stores the customer's raw `originalText` and `originalLanguage`. When an agent views a ticket, `findOneTranslated()` computes translations on-demand into that specific agent's `preferredLanguage` (reusing stored translations when matching, or translating dynamically), while preserving the unmodified original text for auditability.

### 5. Exponential Backoff for Rate Limiting & Transient Errors
To withstand cloud API limits (`429 Too Many Requests`) or transient server glitches (`5xx`), `NvidiaClientService` employs an exponential backoff retry loop ($1000\text{ms} \to 2000\text{ms} \to 4000\text{ms}$) with an explicit 15-second `AbortController` timeout per attempt. Every invocation records latency and status codes into the `AiLog` telemetry table.

---

## Local Setup

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **PostgreSQL Database**: Free serverless Postgres project from [Neon](https://neon.tech)
- **Redis Instance**: Free serverless Redis database from [Upstash](https://upstash.com)
- **NVIDIA Build API Key**: Free key from [build.nvidia.com](https://build.nvidia.com/)

> 💡 **Zero-Cost Cloud Stack**: There is no local database or Docker setup required. Create a free project on [Neon](https://neon.tech) for PostgreSQL and a free database on [Upstash](https://upstash.com) for Redis, then paste their connection strings into `api/.env`.

---

### Step 1: Clone Repository
```bash
git clone https://github.com/AhmedAfni/polydesk.git
cd polydesk
```

---

### Step 2: Configure Environment Variables

#### API (`api/.env`)
Create `api/.env` from `api/.env.example`:
```bash
cp api/.env.example api/.env
```
Ensure the following variables are configured in `api/.env`:
```env
PORT=3000
DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require"
REDIS_URL="rediss://default:password@xyz.upstash.io:6379"
NVIDIA_API_KEY="nvapi-your-actual-nvidia-key"
JWT_SECRET="your-secure-random-jwt-secret-key"
```

#### Web Client (`web/.env`)
Create `web/.env` from `web/.env.example`:
```bash
cp web/.env.example web/.env
```
Ensure the following variable is configured in `web/.env`:
```env
VITE_API_URL="http://localhost:3000"
```

---

### Step 3: Install Dependencies

```bash
# Install backend dependencies
cd api
npm install

# Install frontend dependencies
cd ../web
npm install
cd ..
```

---

### Step 4: Run Database Migrations & Seed Demo Data

```bash
cd api

# Run Prisma migrations to create schema
npx prisma migrate dev

# Populate demo tickets across 5 languages & enqueue AI jobs
npm run seed

cd ..
```

---

### Step 5: Start Development Servers

Run the backend and frontend services in separate terminal windows:

#### Terminal 1 — Backend API:
```bash
cd api
npm run start:dev
```
*API will run at `http://localhost:3000`.*

#### Terminal 2 — Frontend Web Client:
```bash
cd web
npm run dev
```
*Web dashboard will run at `http://localhost:5173`.*

---

## Creating Your First Agent Account

Since there is no default pre-configured login credential, your first support agent account must be created via the API registration endpoint.

Execute the following `curl` command in your terminal while the backend API is running:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"agent@example.com","password":"yourpassword","name":"Your Name"}'
```

Once created, you can log in at `/login` (`http://localhost:5173/login`) using those credentials. Additional agent accounts can be created at any time using the same registration endpoint.

---

## Testing Strategy

PolyDesk uses a two-tiered testing strategy with [Vitest](https://vitest.dev/) to balance local developer velocity with robust end-to-end pipeline validation:

### 1. Isolated Unit Tests (`npm test`)
- **Scope**: Targets `api/src/**/*.spec.ts`.
- **Purpose**: Fast, isolated tests for utility logic, DTO validation, guard conditions, and controller unit boundaries.
- **Run command**:
  ```bash
  cd api
  npm test
  ```

### 2. End-to-End Integration Tests (`npm run test:integration`)
- **Scope**: Targets `api/test/**/*.integration-spec.ts`.
- **Purpose**: Validates the end-to-end backend pipeline against a real database (Postgres) and real NestJS modules while mocking upstream NVIDIA AI HTTP endpoints for fast, deterministic, and zero-cost test runs.
- **What is verified**:
  - **Full Ticket & AI Pipeline (`ticket-pipeline.integration-spec.ts`)**: Ingesting a non-English ticket via `POST /tickets`, database persistence across `Customer`, `Ticket`, and `Message`, queueing, AI processing via `MessageProcessor.process()` (updating urgency, topic, English summary, and status), and agent reply translation via `POST /tickets/:id/reply`.
  - **Authentication Flow (`auth-flow.integration-spec.ts`)**: Agent registration, bcrypt password hashing verification in the database, JWT token generation on login, 401 on bad credentials, and route protection guards.
  - **Arabic-Echo Bug Regression (`translation-bug-regression.integration-spec.ts`)**: Specifically tests the translation echo bug fix where LLM output echoes the input text; verifies Levenshtein similarity detection and automated retry mechanism with targeted system prompts.
- **Database isolation**: Integration tests automatically clean up all created test records in an `afterAll` hook, keeping the database in a clean state.
- **Run command**:
  ```bash
  cd api
  npm run test:integration
  ```

---

## Known Limitations & Future Work

- **Single-Tenant Architecture**: PolyDesk is currently structured as a single-organization support desk. A production SaaS evolution would introduce multi-tenancy with organization isolation, custom domain routing, and per-tenant AI API keys.
- **Automated AI Triage without Human-in-the-Loop Review**: Categorization and urgency levels are applied automatically by the LLM. Future revisions could include an agent confidence score threshold that flags low-certainty classifications for manual supervisor review.
- **General-Purpose LLM Translation vs. Specialized Translation APIs**: PolyDesk utilizes open-weights instruction models (Llama 3.2 / 3.3) for translation to demonstrate cohesive LLM integration. Specialized translation APIs (or fine-tuned translation models) could provide higher domain-specific terminology fidelity.
- **Embeddable Customer Widget**: Currently, tickets are ingested via REST endpoint. A natural enhancement is an embeddable customer chat widget script for direct website integration.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
