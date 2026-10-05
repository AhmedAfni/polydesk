# PolyDesk API Backend

The PolyDesk backend is a modular NestJS service responsible for ticket lifecycle management, authentication, asynchronous AI-driven classification and translation, background queue workers, and WebSocket event broadcasts.

---

## Capabilities
- **Ticket CRUD & Ingestion**: REST endpoints for ticket creation, listing, retrieval, and replies.
- **Asynchronous AI Workers**: BullMQ worker processing inbound tickets for language detection, category classification, urgency scoring, and English summarization.
- **Real-Time WebSockets**: Socket.io gateway broadcasting `ticket:created` and `ticket:updated` events to connected agent clients.
- **Dynamic Multilingual Translation**: Per-agent translation layer translating ticket threads into the requesting agent's preferred language.
- **AI Observability & Telemetry**: Logs every LLM invocation with latency, model version, and error tracking in PostgreSQL (`AiLog`).
- **Security & Reliability**: JWT authentication, endpoint rate limiting (`@nestjs/throttler`), exponential backoff on AI calls, and health checks (`@nestjs/terminus`).

---

## Environment Variables

Copy `.env.example` to `.env` in the `api/` directory:

```bash
cp .env.example .env
```

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `PORT` | No | HTTP port for the NestJS server (defaults to `3000`) | `3000` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string for Prisma ORM | `postgresql://postgres:postgres@localhost:5432/polydesk?schema=public` |
| `REDIS_URL` | **Yes** | Redis connection string for BullMQ queue processing | `redis://localhost:6379` |
| `NVIDIA_API_KEY` | **Yes** | API key for NVIDIA Foundation Endpoints | `nvapi-...` |
| `JWT_SECRET` | **Yes** | Secret key for signing and verifying JWT tokens | `your-secret-key-here` |

---

## Running Standalone

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migrations
```bash
npx prisma migrate dev
```

### 3. (Optional) Seed Demo Data
Populates the database with realistic multilingual tickets (Spanish, Arabic, Dutch, French, English) and queues them for AI processing:
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run start:dev
```
The server will start on `http://localhost:3000`.

### 5. Running Tests & Linters
```bash
# Run unit tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```
