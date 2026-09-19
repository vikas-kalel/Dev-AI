# DevAI — Monorepo

DevAI is an AI-powered developer chat assistant built with React 19, Vite, Express, and the Google Gemini API. It is organized as a clean npm workspaces monorepo with isolated `frontend` and `backend` packages.

---

## Monorepo Architecture

```
Dev-AI/
├── frontend/                 # Single Page Application (React 19 + Vite + Tailwind CSS)
│   ├── package.json          # Frontend dependencies & scripts
│   ├── tsconfig.json         # Frontend TypeScript configuration
│   ├── vite.config.ts        # Vite config (Port 5173, proxies /api → Port 5000)
│   ├── index.html            # HTML entry point
│   └── src/
│       ├── components/       # React UI components (ChatWindow, ChatInput, MessageItem, …)
│       ├── services/         # API client (SSE streaming + REST fallback)
│       └── types/            # Shared TypeScript interfaces
│
├── backend/                  # REST & SSE API (Express + Google GenAI)
│   ├── package.json          # Backend dependencies & scripts
│   ├── tsconfig.json         # Backend TypeScript configuration
│   └── src/
│       ├── config/           # Gemini API client & model configuration
│       ├── controllers/      # Express route controllers (chat, health)
│       ├── middleware/        # Global error handler
│       ├── routes/           # API router (/api/chat, /api/health)
│       ├── services/         # Gemini inference service (streaming + model fallback)
│       └── index.ts          # Server entry point (Port 5000)
│
├── package.json              # Monorepo root — npm workspaces + concurrently
└── README.md
```

---

## Prerequisites

- **Node.js** v18 or higher
- **npm** v7 or higher
- **Gemini API Key** — obtain from [Google AI Studio](https://aistudio.google.com/)

---

## Getting Started

### 1. Install All Dependencies

From the **root** directory (installs both workspaces in one step):

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file inside the `backend/` directory:

```env
GEMINI_API_KEY=your-gemini-api-key-here
PORT=5000
```

### 3. Run Both Servers

From the **root** directory:

```bash
npm run dev
```

This uses `concurrently` to start both services simultaneously:

| Service  | URL                      |
|----------|--------------------------|
| Backend  | http://localhost:5000    |
| Frontend | http://localhost:5173    |

The Vite dev server automatically proxies all `/api` requests to the backend on port 5000.

---

## Individual Service Commands

Run each service independently from the root:

```bash
# Backend only (http://localhost:5000)
npm run dev:backend

# Frontend only (http://localhost:5173)
npm run dev:frontend
```

Or from within each workspace directory:

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

---

## Lint & Build Commands

All commands run from the **root** directory:

```bash
# Type-check both packages
npm run lint

# Build both packages for production
npm run build

# Build individual packages
npm run build:backend
npm run build:frontend
```

---

## API Endpoints

| Method | Endpoint          | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | `/api/health`     | Server health check                      |
| POST   | `/api/chat/ask`   | Non-streaming chat response (JSON)       |
| POST   | `/api/chat/stream`| Streaming chat response (SSE)            |
| GET    | `/api/chat/health`| Chat service health sub-check            |

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite 8, Tailwind CSS 4   |
| Backend   | Node.js, Express 4, TypeScript, tsx             |
| AI        | Google Gemini API (`@google/genai`)             |
| Streaming | Server-Sent Events (SSE)                        |
| Monorepo  | npm workspaces + concurrently                   |
