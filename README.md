# Chat AI - Monorepo Structure

This project is organized into two completely isolated services inside a single repository:

```
├── frontend/             # Frontend Single Page Application (React 19 + Vite)
│   ├── package.json      # Dedicated frontend dependencies & scripts
│   ├── vite.config.ts    # Dedicated Vite config (runs on Port 5173 with proxy)
│   ├── tsconfig.json     # Frontend TypeScript setup
│   ├── node_modules/     # Independent frontend node_modules
│   ├── index.html
│   └── src/              # React components, styles, services
│
├── backend/              # Backend REST & SSE API (Express + Google GenAI)
│   ├── package.json      # Dedicated backend dependencies & scripts
│   ├── tsconfig.json     # Backend TypeScript setup
│   ├── node_modules/     # Independent backend node_modules
│   └── src/              # Routes, controllers, and services (runs on Port 5000)
│
└── server.ts             # Container root gateway & reverse proxy (Port 3000)
```

## Running Independently

### 1. Backend Service (Port 5000)
```bash
cd backend
npm install
npm run dev
# Server boots at http://localhost:5000
```

### 2. Frontend Service (Port 5173)
```bash
cd frontend
npm install
npm run dev
# Frontend boots at http://localhost:5173 (proxies /api to localhost:5000)
```

### 3. Unified Monorepo Runner
From the root directory:
```bash
npm run dev:frontend   # Launches frontend independently
npm run dev:backend    # Launches backend independently
npm run dev            # Launches unified gateway on port 3000
```
