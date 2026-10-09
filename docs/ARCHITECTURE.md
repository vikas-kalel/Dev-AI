# DevAI — High-Level Architecture (HLD)

## 1. Overall System High-Level Architecture (System HLD)

**DevAI** is a multi-tenant, project-centric AI developer workspace and assistant powered by Google Gemini (`@google/genai`).

The platform consists of a **React 19 Frontend**, an **Express / Node.js Backend**, a **MongoDB Database**, a **Transactional Outbox Worker**, and the **Google Gemini Cloud API**.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#1e293b',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#38bdf8',
    'lineColor': '#38bdf8',
    'textColor': '#ffffff',
    'mainBkg': '#0f172a',
    'nodeBorder': '#38bdf8',
    'clusterBkg': '#0b1120',
    'clusterBorder': '#334155'
  }
}}%%
flowchart TD
    subgraph Client["Frontend Tier (React 19 :5173)"]
        UI["React 19 SPA\n(Workspace UI & Chat)"]
        ClientState["Client State\n(TanStack Query + Zustand)"]
        SSEConsumer["SSE Stream Reader\n(chatService.ts)"]
    end

    subgraph Proxy["Vite Dev Proxy (:5173)"]
        ViteProxy["/api/* -> localhost:5000"]
    end

    subgraph Server["Backend Tier (Express / Node.js :5000)"]
        Gateways["API Gateways & Middleware\n(Auth, RBAC, Logging, Request ID)"]
        Controllers["Domain Controllers\n(Auth, Org, Project, Member, Conv, Source)"]
        Services["Domain Services & Invariant Guards\n(Last Maintainer & Last Admin Checks)"]
        AIEngine["AI Provider Engine\n(Context Pruning, Model Fallback)"]
        OutboxWorker["Outbox Email Worker\n(Polls every 3000ms)"]
    end

    subgraph Storage["Persistence & External Services"]
        MongoDB[("MongoDB Database\n(Organizations, Projects, Messages)")]
        GeminiCloud["Google Gemini API Cloud\n(3.1-flash-lite / 3.6-flash / 3.8-flash)"]
        SMTPGateway["SMTP Mail Gateway\n(Transactional Delivery)"]
    end

    %% Flows
    UI --> ClientState
    UI --> SSEConsumer
    SSEConsumer --> ViteProxy
    ViteProxy --> Gateways
    Gateways --> Controllers
    Controllers --> Services
    Services --> MongoDB
    Services --> AIEngine
    AIEngine --> GeminiCloud

    %% Outbox
    Services -.->|Atomic Insert OutboxEvent| MongoDB
    OutboxWorker -->|Poll Pending Events| MongoDB
    OutboxWorker --> SMTPGateway
```

### Core System Principles
1. **Multi-Tenancy Hierarchy**: `Organization` ➔ `Project` ➔ `Conversation` ➔ `Message` & `Attachment`.
2. **Context-Bound Authorization**: Roles belong to memberships (`ADMIN`/`MEMBER` in orgs, `MAINTAINER`/`DEVELOPER` in projects), never to users globally.
3. **Domain Survival Invariants**: Projects cannot lose their last `MAINTAINER`; organizations cannot lose their last `ADMIN`.
4. **Transactional Outbox**: Emails and notifications are inserted as database events atomically with mutations, completely avoiding dual-write failures.

---

## 2. Frontend High-Level Architecture (FE HLD)

The frontend is a single-page application built with **React 19**, **Vite**, **Tailwind CSS**, and **TypeScript**.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#1e293b',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#38bdf8',
    'lineColor': '#38bdf8',
    'textColor': '#ffffff',
    'mainBkg': '#0f172a',
    'nodeBorder': '#38bdf8',
    'clusterBkg': '#0b1120',
    'clusterBorder': '#334155'
  }
}}%%
flowchart TD
    subgraph UIViews["1. Presentation & Views"]
        TopBar["TopBar (Project Switcher, User Menu)"]
        NavSidebar["RoleAwareSidebar (Navigation & Admin Links)"]
        Workspace["ChatWorkspace / Sources / Members Pages"]
        ChatWindow["ChatWindow (MessageList, ChatInput, Footer)"]
    end

    subgraph RouterTier["2. Router & Layout Shells"]
        AuthLayout["AuthLayout (/login, /signup, /verify-email)"]
        AppLayout["AppLayout (Enterprise Shell + Modals + Toasts)"]
    end

    subgraph StateTier["3. State Management"]
        ReactQuery["TanStack React Query\n(Server Cache, Background Invalidation)"]
        ZustandStore["Zustand UI Store\n(Sidebars, Modals, Current Org/Project, Toasts)"]
        LocalStorage["localStorage\n(Sidebar State, Preferences)"]
    end

    subgraph ServiceTier["4. API & Streaming Layer"]
        APIClient["REST Client (api.ts)\n(Fetch with Credentials)"]
        SSEReader["SSE Stream Reader (chatService.ts)\n(ReadableStream, TextDecoder, Line Buffer)"]
        WebSpeech["Web Speech API\n(Microphone Voice-to-Text)"]
    end

    UIViews --> RouterTier
    RouterTier --> StateTier
    Workspace --> ChatWindow
    ChatWindow --> WebSpeech
    ChatWindow --> SSEReader
    Workspace --> APIClient
    StateTier <--> LocalStorage
```

### Frontend Responsibilities
- **Layouts & Route Guarding**: [`AppLayout.tsx`](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/layouts/AppLayout.tsx) provides a unified workspace with top bar, collapsible sidebar, and toast notifications. [`AuthLayout.tsx`](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/layouts/AuthLayout.tsx) wraps onboarding and auth.
- **Server Cache Management**: Uses `@tanstack/react-query` to cache and synchronize server state across projects, conversations, members, and sources.
- **Global UI Store**: Uses Zustand ([`useUIStore.ts`](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/stores/useUIStore.ts)) for active context, dual sidebar states (navigation and chat history), and modal dialogs.
- **Voice-to-Text**: Integrates the native browser Web Speech API for real-time speech input.
- **SSE Stream Consumer**: Consumes real-time token chunks via `fetch` and `ReadableStream.getReader()`, parsing Server-Sent Events line by line.

---

## 3. Backend High-Level Architecture (BE HLD)

The backend is an **Express / Node.js** service structured into distinct layers: middleware, controllers, domain services, security policies, background workers, and data persistence.

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#1e293b',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#38bdf8',
    'lineColor': '#38bdf8',
    'textColor': '#ffffff',
    'mainBkg': '#0f172a',
    'nodeBorder': '#38bdf8',
    'clusterBkg': '#0b1120',
    'clusterBorder': '#334155'
  }
}}%%
flowchart TD
    subgraph Inbound["1. HTTP Pipeline & Security Middleware"]
        CORS["CORS & CookieParser"]
        ReqId["Request ID Middleware (X-Request-Id)"]
        AuthMiddleware["Auth Middleware (JWT & Session Revocation Check)"]
        RBACMiddleware["RBAC Middleware (requireOrgRole, requireProjectRole)"]
    end

    subgraph APIControllers["2. Controllers & Routing (/api/v1)"]
        AuthController["authController"]
        OrgController["organizationController"]
        ProjectController["projectController"]
        MemberController["membershipController"]
        ConversationController["conversationController (SSE Streaming)"]
        SourceController["sourceController"]
    end

    subgraph DomainServices["3. Domain Services & Policies"]
        AuthService["authService"]
        OrgService["organizationService"]
        ProjectService["projectService"]
        MemberService["membershipService"]
        ConvService["conversationService"]
        Invariants["Invariant Engine (assertNotLastMaintainer, assertNotLastAdmin)"]
    end

    subgraph Inference["4. AI Provider Engine"]
        AIInterface["AIProvider Abstraction"]
        GeminiImpl["GeminiProvider (Prompt Grounding + sdk)"]
        GeminiService["geminiService (Sliding Context Window, Fallback Cascading)"]
        MockImpl["MockAIProvider (Offline / Testing)"]
    end

    subgraph OutboxTier["5. Outbox & Background Processing"]
        OutboxWorker["emailWorker (Polls every 3000ms, Max 5 Retries)"]
        EmailService["emailService (Nodemailer SMTP Client)"]
    end

    subgraph DataTier["6. Database Layer (MongoDB)"]
        MongooseModels["14 Mongoose Collections\n(users, orgs, projects, memberships, messages, outbox_events)"]
    end

    Inbound --> APIControllers
    APIControllers --> DomainServices
    DomainServices --> Invariants
    DomainServices --> DataTier
    DomainServices --> Inference
    AIInterface --> GeminiImpl
    AIInterface --> MockImpl
    GeminiImpl --> GeminiService
    DomainServices -.->|Atomic Insert| DataTier
    OutboxWorker -->|Poll & Update| DataTier
    OutboxWorker --> EmailService
```

### Backend Responsibilities
- **Authentication**: Supports dual-mode authentication via HTTP-only signed cookies (`devai_session`) and `Bearer` JWT tokens, coupled with active session verification in MongoDB.
- **RBAC & Invariant Enforcement**: Protects routes using `requireOrgRole` and `requireProjectRole`, and protects role changes with [`assertNotLastMaintainer`](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/policies/invariants.ts#L10-L34) and [`assertNotLastAdmin`](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/policies/invariants.ts#L40-L62).
- **Credentials Encryption**: Sensitive third-party source tokens (GitHub, Jira) are encrypted at rest using **AES-256-GCM**.
- **Transactional Outbox Worker**: Decouples email sending from HTTP request lifecycles.

---

## 4. Server-Sent Events (SSE) Streaming HLD — How It Works

### 4.1 Why SSE Over WebSockets?
- **Unidirectional Communication**: AI text generation is strictly server-to-client streaming. SSE is purpose-built for unidirectional server push over standard HTTP.
- **Native HTTP/2 Multiplexing**: SSE operates seamlessly over existing HTTP infrastructure, proxies, and SSL/TLS without requiring custom protocol upgrades.
- **Simpler Resilience & Cancellation**: The client cancels generation cleanly using standard browser `AbortController`, closing the HTTP connection without maintaining persistent socket states.

---

### 4.2 SSE Streaming High-Level Sequence

The diagram below outlines the **"Reserve-Then-Fill"** streaming architecture with high-contrast signal lines and pure white text:

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#1e293b',
    'primaryTextColor': '#ffffff',
    'primaryBorderColor': '#38bdf8',
    'lineColor': '#38bdf8',
    'signalColor': '#38bdf8',
    'signalTextColor': '#ffffff',
    'messageColor': '#ffffff',
    'messageTextColor': '#ffffff',
    'labelBoxBkgColor': '#1e293b',
    'labelBoxBorderColor': '#38bdf8',
    'labelTextColor': '#ffffff',
    'loopTextColor': '#ffffff',
    'noteBorderColor': '#f59e0b',
    'noteBkgColor': '#1e293b',
    'noteTextColor': '#ffffff',
    'activationBorderColor': '#38bdf8',
    'activationBkgColor': '#334155',
    'sequenceNumberColor': '#ffffff',
    'actorBkg': '#0f172a',
    'actorBorder': '#38bdf8',
    'actorTextColor': '#ffffff',
    'actorLineColor': '#64748b'
  }
}}%%
sequenceDiagram
    autonumber
    actor Dev as Developer (UI)
    participant Client as chatService.ts
    participant API as Express API
    participant DB as MongoDB
    participant Gemini as Google Gemini API

    Dev->>Client: 1. Submit prompt & attach AbortController
    Client->>API: 2. POST /conversations/:id/messages/stream
    
    API->>API: 3. Flush SSE headers (text/event-stream)
    
    Note over API,DB: PHASE 1: RESERVE
    API->>DB: 4. Save User Message (status: "DONE")
    API->>DB: 5. Reserve Assistant placeholder (status: "STREAMING")
    DB-->>API: 6. Return generated assistantMessageId
    API-->>Client: 7. SSE: {"type": "start", "assistantMessageId": "..."}

    Note over API,Gemini: PHASE 2: STREAM
    API->>Gemini: 8. generateContentStream(prunedHistory + prompt)
    loop Token Generation Loop
        Gemini-->>API: 9. Token chunk ("const express = ...")
        API-->>Client: 10. SSE: {"type": "chunk", "text": "..."}
        Client->>Dev: 11. Incremental Markdown render & autoscroll
    end

    alt Stream Completed (Happy Path)
        Gemini-->>API: 12a. Stream complete + usage metadata
        Note over API,DB: PHASE 3: FILL (DONE)
        API->>DB: 13a. Update Assistant row (status: "DONE", fullText, tokens)
        API-->>Client: 14a. SSE: {"type": "done", "conversationId": "..."}
        API->>API: 15a. res.end() (Close HTTP stream)
    else User Abort / Disconnection
        Dev->>Client: 12b. Click "Stop Generating"
        Client->>API: 13b. HTTP abort signal via AbortController
        Note over API,DB: PHASE 3: FILL (PARTIAL)
        API->>DB: 14b. Update Assistant row (status: "PARTIAL", partialText)
        API->>API: 15b. res.end()
    end
```

---

### 4.3 How the Streaming Pipeline Works Step-by-Step

| Phase | Component | Action | Description |
|---|---|---|---|
| **1. Request** | [`ChatWindow.tsx`](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/components/ChatWindow.tsx) | Optimistic Turn & AbortController | Renders user message immediately in UI, attaches an `AbortController`, and sends POST to `/messages/stream`. |
| **2. SSE Init** | [`conversationController.ts`](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/controllers/conversationController.ts) | Header Flush | Sets `Content-Type: text/event-stream`, `Connection: keep-alive`, and calls `res.flushHeaders()` to bypass proxy buffering. |
| **3. Reserve** | [`conversationService.ts`](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/services/conversationService.ts) | Advance Reservation | Persists User turn (`status: DONE`), then creates Assistant placeholder with `status: STREAMING` in MongoDB. Sends `{"type": "start", "assistantMessageId": "..."}` to the client. |
| **4. Inference** | [`geminiService.ts`](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/services/geminiService.ts) | Context Pruning & Fallback | Applies sliding window (10 turns, 32k char budget). Cascades model fallback: `3.1-flash-lite` ➔ `3.6-flash` ➔ `3.8-flash`. |
| **5. Chunks** | Express ➔ [`chatService.ts`](file:///c:/Users/Vikas/Desktop/Dev-AI/frontend/src/services/chatService.ts) | SSE Event Stream | Emits `data: {"type": "chunk", "text": "..."}\n\n`. Client decodes bytes via `ReadableStream` and renders Markdown. |
| **6. Fill (Done)**| [`conversationService.ts`](file:///c:/Users/Vikas/Desktop/Dev-AI/backend/src/services/conversationService.ts) | State Finalization | On stream end, updates the MongoDB row to `status: "DONE"` with token counts and duration. Emits `{"type": "done"}`. |
| **7. Abort** | Express Controller | Cancellation Guard | If client cancels, catches abort signal, saves partial text to MongoDB with `status: "PARTIAL"`, preventing message loss. |

---

## 5. Key System Information & Quick Reference

### 5.1 Technology Stack Summary
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, TanStack React Query, Zustand, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Mongoose (MongoDB), Winston Logger.
- **AI Cloud**: Google Gemini API (`@google/genai`) with model cascading and context pruner.
- **Worker & Mail**: Transactional Outbox Pattern, Polling Email Worker, Nodemailer SMTP.

### 5.2 Key Invariants & Safeguards
- **`assertNotLastMaintainer`**: A project workspace must always have $\ge 1$ active Maintainer.
- **`assertNotLastAdmin`**: An organization tenant must always have $\ge 1$ active Admin.
- **AES-256-GCM Encryption**: Third-party OAuth tokens and secrets encrypted at rest.
- **Session Revocation**: Bearer tokens and cookies checked against server-side session state on every authenticated call.

### 5.3 Common Development Commands
```bash
# Run both frontend and backend concurrently
npm run dev

# Run individual workspaces
npm run dev:backend    # Port 5000
npm run dev:frontend   # Port 5173

# Run core invariant verification suite
cd backend && npx tsx tests/v1_core_invariants.test.ts
```
