# Dev AI Workspace — V1 LLD Plan

This document is an implementation plan for the four core V1 documents. It does not override them.

## Backend LLD — Node + Express + TypeScript

### Package responsibilities

```text
config/
  environment
  database
  security

modules/
  auth
  organizations
  projects
  memberships
  invitations
  conversations
  attachments
  knowledge-sources
  audit
  notifications

infrastructure/
  mongodb
  email
  outbox
  storage

middleware/
  auth
  validation
  rate-limit
  request-id
  error-handler

policies/
  organization-policy
  project-policy
  membership-policy

workers/
  email-worker
```

### Core interfaces

```ts
interface MembershipRepository {
  findProjectMembership(userId: ObjectId, projectId: ObjectId): Promise<ProjectMembership | null>;
  updateRole(...): Promise<ProjectMembership>;
}

interface EmailService {
  sendVerification(...): Promise<void>;
  sendPasswordReset(...): Promise<void>;
  sendInvitation(...): Promise<void>;
  sendRoleChanged(...): Promise<void>;
}

interface AIProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
}
```

### Critical service methods

```text
AuthService
- signup
- verifyEmail
- login
- logout
- forgotPassword
- resetPassword
- me

OrganizationService
- create
- overview
- users

ProjectService
- create
- list
- get
- archive

MembershipService
- list
- add
- remove
- changeRole
- transferMaintainer

InvitationService
- create
- accept
- resend
- revoke

ConversationService
- create
- list
- get
- archive
- sendMessage

AttachmentService
- upload
- remove
- cleanup

SourceService
- list
- create
- update
- disconnect
```

### Backend implementation sequence

```text
1. Express bootstrap
2. Configuration/env validation
3. MongoDB connection
4. Models + indexes
5. Request ID + logging
6. Error middleware
7. Validation
8. Auth/session
9. Verification/password reset
10. Organization creation
11. Project creation/selection
12. Membership/RBAC
13. Invitation lifecycle
14. Outbox
15. Email worker
16. Admin reporting
17. Conversation/chat shell
18. Attachment metadata/storage abstraction
19. Source foundation
20. Security hardening
21. Tests
```

### Backend production rules

- Controllers contain no domain business logic.
- Services own transactions.
- Repositories own persistence.
- Policies own authorization decisions.
- Never trust frontend role/project.
- Every mutation validates actor + target + organization/project scope.
- Use MongoDB transactions for cross-document invariants.
- Use unique indexes for duplicate prevention.
- Outbox handlers must be idempotent.

---

## Frontend LLD — React + TypeScript + Zustand + React Query + Tailwind

### Folder structure

```text
src/
├── app/
│   ├── router/
│   ├── providers/
│   └── query-client/
├── features/
│   ├── auth/
│   ├── organization/
│   ├── projects/
│   ├── admin/
│   ├── members/
│   ├── invitations/
│   ├── chat/
│   ├── attachments/
│   ├── knowledge/
│   └── sources/
├── components/
├── layouts/
├── services/
├── stores/
├── hooks/
├── types/
└── utils/
```

### State ownership

React Query:
```text
me
organizations
projects
members
invitations
conversations
messages
sources
knowledge
admin metrics
```

Zustand:
```text
sidebar state
modal state
temporary UI state
composer draft if needed
UI preferences
```

Do not copy React Query server data into Zustand.

### Route hierarchy

```text
/auth/*
/onboarding/*
/projects
/projects/:projectId/*
/admin/*
```

### Core components

```text
AppShell
ProjectSelector
RoleAwareSidebar
AdminOverview
UserTable
ProjectMembersTable
InviteMemberDialog
ChangeRoleDialog
RemoveMemberDialog
ProjectChat
ConversationList
MessageList
MessageBubble
ChatComposer
AttachmentPicker
SourceList
SourceCard
AddSourceDialog
KnowledgeList
ProjectSettings
```

### Query/mutation hooks

```text
useCurrentUser()
useProjects()
useProject()
useProjectMembers()
useInviteMember()
useChangeRole()
useRemoveMember()
useConversations()
useConversation()
useSendMessage()
useUploadAttachment()
useSources()
useCreateSource()
useUpdateSource()
useDisconnectSource()
useAdminOverview()
```

### Cache invalidation

Role change:
```text
invalidate project members
invalidate admin overview
refetch current permissions/me
```

Removal:
```text
invalidate project members
invalidate projects
if current user → navigate /projects
```

Invitation:
```text
invalidate members
invalidate invitations
invalidate admin overview
```

### Frontend implementation sequence

```text
1. Tailwind/theme + app shell
2. Router
3. API client
4. Auth/session bootstrap
5. Login/signup/verification/recovery
6. Organization onboarding
7. Project selection
8. Admin dashboard
9. Members/RBAC
10. Invitation flows
11. Role-aware navigation
12. Chat shell
13. Attachment flow
14. Sources
15. Knowledge
16. Settings
17. Responsive/accessibility
18. E2E tests
```

## V1 version-by-version delivery

### V1.1 — Authentication
Deliver:
- signup
- login
- logout
- verification
- forgot/reset password
- sessions
- auth UI

### V1.2 — Organization
Deliver:
- organization creation
- Admin membership
- organization overview shell

### V1.3 — Projects
Deliver:
- project creation
- project list
- project selection
- archive

### V1.4 — RBAC
Deliver:
- project memberships
- Developer/Maintainer
- Admin role management
- permission policies
- last Admin/Maintainer rules

### V1.5 — Invitations
Deliver:
- invitation creation
- accept
- resend
- revoke
- expiry
- email worker

### V1.6 — Admin/Maintainer management
Deliver:
- admin reporting
- member tables
- role transitions
- audit activity

### V1.7 — Workspace/chat shell
Deliver:
- project chat
- conversations
- messages
- mock AI provider

### V1.8 — Temporary context
Deliver:
- file upload
- validation
- conversation attachments
- cleanup lifecycle

### V1.9 — Knowledge foundation
Deliver:
- permanent knowledge UI
- source abstraction
- source status

### V1.10 — Integration connection foundation
Deliver:
- GitHub connection UI/API
- Jira connection UI/API
- Confluence connection UI/API
- encrypted configuration
- connection state

Full ingestion/RAG is explicitly deferred.

### V1.11 — Production hardening
Deliver:
- rate limiting
- security headers
- observability
- health/readiness
- retry handling
- concurrency tests
- authorization tests
- cross-project isolation tests
- E2E tests
- deployment readiness

## Later versions

```text
V2  Gemini + streaming
V3  Document ingestion
V4  Embeddings + RAG
V5  Advanced retrieval/citations
V6  Live GitHub/Jira/Confluence tools
V7  Tool calling
V8  LangChain/LangGraph
V9  Memory/context engineering
V10 Multi-agent
V11 MCP
...
```

The V1 identity/project/RBAC architecture should not need to be redesigned for these versions.
