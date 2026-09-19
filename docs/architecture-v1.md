# Architecture v1 - DevAI

## 1. Overview

**DevAI** is an AI-powered developer assistant built on a modern monorepo architecture with an asynchronous streaming pipeline connecting a **React 19 Frontend** (powered by Vite) to an **Express/Node.js Backend** and **Google Gemini Models via `@google/genai`**.

---

## 2. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser :5173)"]
        UI["React 19 App UI\n(ChatWindow, ChatInput, MessageList)"]
        Speech["Web Speech API\n(Voice-to-Text Input)"]
        Store["Local Storage\n(Session Persistence)"]
        CS["chatService.ts\n(Fetch & SSE Stream Consumer)"]
    end

    subgraph Proxy["Vite Dev Server Proxy (:5173)"]
        VP["Proxy Route: /api/* -> localhost:5000"]
    end

    subgraph Server["Backend Tier (Express / Node.js :5000)"]
        Router["chatRoutes.ts\n(/api/chat/stream, /api/chat/ask, /api/health)"]
        Controller["chatController.ts\n(Request Validation & SSE Flush)"]
        
        subgraph Engine["Gemini Service Engine"]
            ContextPruner["Context Pruner & Budget Guard\n(Sliding 10-msg Window & 32k Char Budget)"]
            FallbackMgr["Model Fallback Cascader\n(3.1-flash-lite -> 3.6-flash -> 3.8-flash)"]
            StreamParser["SSE Stream Generator & Token Tracker"]
        end
        
        GeminiConfig["gemini.ts\n(Client Init & API Key Management)"]
        ErrHandler["errorHandler.ts\n(Centralized Error Sanitization)"]
    end

    subgraph External["Google Gemini API Cloud"]
        PrimaryModel["Primary: gemini-3.1-flash-lite"]
        FallbackModel1["Fallback 1: gemini-3.6-flash"]
        FallbackModel2["Fallback 2: gemini-3.8-flash"]
    end

    %% Client Internal Flow
    Speech -->|Transcript delta| UI
    UI <-->|Cache state| Store
    UI -->|Trigger prompt| CS

    %% Client to Server
    CS -->|HTTP POST /api/chat/stream| VP
    VP --> Router
    Router --> Controller
    Controller --> ContextPruner
    ContextPruner --> FallbackMgr
    GeminiConfig -->|GoogleGenAI Client Instance| FallbackMgr

    %% Backend to Gemini API
    FallbackMgr -->|Pruned Payload Stream Request| PrimaryModel
    PrimaryModel -.->|503 / 429 / Capacity Error| FallbackModel1
    FallbackModel1 -.->|503 / 429 / Capacity Error| FallbackModel2

    %% SSE Stream Back
    PrimaryModel -->|Token Stream & usageMetadata| StreamParser
    FallbackModel1 -->|Token Stream & usageMetadata| StreamParser
    FallbackModel2 -->|Token Stream & usageMetadata| StreamParser

    StreamParser -->|Stream Chunks| Controller
    Controller -->|Server-Sent Events: text/event-stream| CS
    CS -->|Delta Render / Token Append| UI
    Controller -.->|Catch Exception| ErrHandler
```

---

## 3. End-to-End Sequence & Communication Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer / User
    participant Frontend as Frontend (ChatWindow / chatService)
    participant Backend as Backend (chatController / geminiService)
    participant Gemini as Google Gemini API Cloud

    User->>Frontend: Enter prompt (Typing or Speech-to-Text)
    User->>Frontend: Click "Generate" / Press Enter
    Frontend->>Frontend: Append User Message & Placeholder Assistant message
    Frontend->>Backend: POST /api/chat/stream { prompt, history, model }
    
    Backend->>Backend: Validate payload & prompt length (<=10k chars)
    Backend->>Backend: Set SSE Headers (Content-Type: text/event-stream, Connection: keep-alive)
    
    Note over Backend: Sliding Window Context Pruning
    Backend->>Backend: 1. Slice last 10 turns (MAX_HISTORY_MESSAGES)
    Backend->>Backend: 2. Cap single turns to 8,000 chars (MAX_SINGLE_TURN_CHARS)
    Backend->>Backend: 3. Accumulate budget backwards (MAX_HISTORY_CHAR_BUDGET = 32k)
    Backend->>Backend: 4. Format into Gemini Content schema
    
    Backend->>Gemini: generateContentStream(model, prunedContents, config)
    
    alt Model Capacity / Transient Error (503 / 429)
        Gemini-->>Backend: Capacity Exhausted / 503 error
        Backend->>Backend: Fallback mechanism triggers next candidate model
        Backend->>Gemini: generateContentStream(fallbackModel, prunedContents, config)
    end

    loop Asynchronous Token Streaming
        Gemini-->>Backend: Chunk data + usageMetadata
        Backend-->>Frontend: data: {"type": "chunk", "text": "..."}
        Frontend->>Frontend: Incrementally render Markdown to DOM & autoscroll
    end

    Gemini-->>Backend: Stream complete (Final usage & token counts)
    Backend-->>Frontend: data: {"type": "done", "totalText": "...", "tokens": 340, "durationMs": 850, "model": "gemini-3.1-flash-lite"}
    Backend->>Backend: End SSE response (res.end())
    Frontend->>Frontend: Mark status as 'sent' & persist state to localStorage
```

---

## 4. Component Breakdown & Responsibilities

### 4.1 Frontend Layer (`frontend/`)

- **[ChatWindow.tsx](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/components/ChatWindow.tsx)**: Orchestrates chat state, local storage persistence, scroll management, retry logic, and cancellation control via `AbortController`.
- **[ChatInput.tsx](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/components/ChatInput.tsx)**: Handles text input, auto-expanding textarea, character limits, keyboard shortcuts (`Enter`, `Esc`), and continuous microphone input via Web Speech API.
- **[MessageList.tsx](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/components/MessageList.tsx)** & **[MessageItem.tsx](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/components/MessageItem.tsx)**: Renders user turns and assistant responses with real-time token stream rendering, syntax-highlighted code blocks, copy actions, and thumbs up/down feedback.
- **[chatService.ts](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/services/chatService.ts)**: Implements browser `ReadableStream` consumption to parse Server-Sent Events (`data: {...}`) line by line, handling chunk emissions and abort signals.

### 4.2 Backend Layer (`backend/`)

- **[index.ts](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/index.ts)**: Configures Express app, CORS policies, JSON body parser limits, routes, and server listener.
- **[chatRoutes.ts](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/routes/chatRoutes.ts)**: Exposes endpoints for streaming chat (`POST /api/chat/stream`), non-streaming fallback (`POST /api/chat/ask`), and health checks (`GET /api/health`).
- **[chatController.ts](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/controllers/chatController.ts)**: Handles input sanitization, validates 10k character limits, manages HTTP SSE connection lifecycle, and listens for client disconnect events.
- **[geminiService.ts](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/services/geminiService.ts)**:
  - **Context Pruning & Sliding Window**:
    - `MAX_HISTORY_MESSAGES = 10`: Limits context to the last 10 messages (5 user / 5 assistant turns).
    - `MAX_HISTORY_CHAR_BUDGET = 32000`: Evaluates backwards to cap historical tokens (~8,000 tokens), preventing cost runaway and attention drift.
    - `MAX_SINGLE_TURN_CHARS = 8000`: Truncates large pasted files from earlier turns to avoid monopolizing context.
  - **Model Cascading**: Fallback cascading (`gemini-3.1-flash-lite` -> `gemini-3.6-flash` -> `gemini-3.8-flash`) upon encountering transient capacity or 503/429 errors.
  - **Streaming & Token Tracking**: Streams token deltas and calculates total duration and token usage.
- **[gemini.ts](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/config/gemini.ts)**: Manages lazy initialization of the `@google/genai` `GoogleGenAI` client using `process.env.GEMINI_API_KEY`.
- **[errorHandler.ts](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/middleware/errorHandler.ts)**: Intercepts unhandled errors, parses internal Google GenAI errors, and formats sanitized responses for client consumption.

---

## 5. Resilience & Fault-Tolerance Features

1. **Sliding Window Context Pruning**: Eliminates $O(N^2)$ token explosion and latency degradation in long conversations by pruning older messages past the 10-message or 32,000-character budget.
2. **Automatic Model Failover**: If the primary Gemini model experiences transient rate-limits (429) or high capacity demand (503), the backend automatically retries with secondary fallback models before failing the request.
3. **Client Disconnection Detection**: The streaming controller tracks `res.on('close')` and `req.on('aborted')` events to cancel upstream token generation and release backend compute resources.
4. **Local Storage Fallback**: User chats are preserved in the browser's `localStorage` across page reloads.
5. **Non-blocking Dev Proxy**: Vite proxies `/api` calls directly to the Express backend without CORS configuration hurdles during development.
