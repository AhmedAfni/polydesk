# PolyDesk Web Frontend

The PolyDesk web client is a single-page application built with React 19, Vite, Tailwind CSS, and Socket.io client. It delivers a support dashboard with real-time inbox updates, ticket conversation threads, agent language toggling, and AI telemetry logs.

---

## Features
- **Real-Time Support Inbox**: Live ticket list with dynamic urgency indicators, category tags, language pills, and AI summaries updated instantly via WebSockets.
- **Interactive Ticket Thread**: Two-way conversation interface displaying messages automatically translated into the agent's preferred language while preserving original customer text.
- **Multilingual Agent Replies**: Support agents can write replies in their preferred language; the system translates them automatically into the customer's language.
- **Per-Agent Language Switching**: Instant profile language switcher allowing agents to seamlessly switch between English, Spanish, Arabic, French, Dutch, German, etc.
- **Admin Observability Dashboard**: Visual cards and telemetry logs displaying AI request counts, success rates, average latency, task distribution, and error traces.
- **Protected Routing & Auth**: JWT-backed authentication flow with session persistence in `localStorage`.

---

## Environment Variables

Copy `.env.example` to `.env` in the `web/` directory:

```bash
cp .env.example .env
```

| Variable | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | No | Base URL of the PolyDesk NestJS backend API & WebSocket server | `http://localhost:3000` |

---

## Running Standalone

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173` (or the port specified by Vite).

### 3. Build for Production
```bash
# Type-check and build production bundle
npm run build

# Preview production build locally
npm run preview
```
