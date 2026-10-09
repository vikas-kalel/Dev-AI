# Dev AI Workspace — V1 High-Level Design

## 1. Architecture goal

Build a production-grade foundation for a project-centric AI developer workspace before adding Gemini, RAG, agents or MCP.

V1 stack:

```text
React + TypeScript
        ↓ HTTPS
Node.js + Express + TypeScript
        ↓
MongoDB
        ↓
Outbox Worker
        ↓
Nodemailer + SMTP
```

Gemini will later plug into an `AIProvider` abstraction.

## 2. High-level architecture

```text
┌──────────────────────────────┐
│ React + TypeScript           │
│                              │
│ Admin / Maintainer / Dev UI  │
└──────────────┬───────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────┐
│ Express API                  │
│                              │
│ Auth                         │
│ Organizations                │
│ Projects                     │
│ Membership / RBAC            │
│ Invitations                  │
│ Conversations                │
│ Attachments                  │
│ Knowledge Sources             │
│ Audit                        │
└──────────────┬───────────────┘
               │
               ▼
        ┌────────────┐
        │  MongoDB   │
        └────────────┘
               │
               ▼
        ┌────────────┐
        │ Outbox     │
        │ Worker     │
        └─────┬──────┘
              │
              ▼
      Nodemailer + SMTP
```

## 3. Backend module boundaries

```text
src/
  modules/
    auth/
    organizations/
    projects/
    memberships/
    invitations/
    conversations/
    attachments/
    knowledge-sources/
    notifications/
    audit/
  infrastructure/
    mongodb/
    email/
    outbox/
  middleware/
  shared/
```

Keep authorization policies close to the domain, not in controllers only.

## 4. Authentication flow

```text
POST /auth/login
 ↓
validate credentials
 ↓
load User
 ↓
create secure session/token
 ↓
return authenticated state
```

For every protected request:

```text
HTTP request
 ↓
Authentication middleware
 ↓
userId
 ↓
organization membership
 ↓
project membership
 ↓
role
 ↓
permission policy
 ↓
controller
 ↓
service
 ↓
MongoDB
```

Frontend roles are never trusted.

## 5. Organization/project onboarding

### New user

```text
Signup
 ↓
Email verification
 ↓
Login
 ↓
No organization
 ↓
Create organization
 ↓
Transaction:
  organization
  + organization_membership(role=ADMIN)
 ↓
Create/select project
```

### Existing invited user

```text
Login
 ↓
Invitation
 ↓
Accept token
 ↓
Transaction:
  invitation = ACCEPTED
  project_membership = ACTIVE
 ↓
Project becomes available
```

## 6. Admin dashboard

Admin API:

```http
GET /api/v1/organizations/:organizationId/overview
GET /api/v1/organizations/:organizationId/users
```

Dashboard returns:
- total users
- active users
- projects
- role counts
- pending invitations
- project-wise membership counts

Admin can drill into a project and update roles.

## 7. Member add flow

```text
Admin/Maintainer
 ↓
POST /projects/:projectId/members
 ↓
authorize actor
 ↓
normalize email
 ↓
existing User?
 ├─ yes → create ProjectMembership
 └─ no → create Invitation
 ↓
transaction:
  membership/invitation
  + audit
  + outbox event
 ↓
HTTP success
 ↓
worker sends email
```

If email fails, membership/invitation remains valid.

## 8. Promotion flow

```text
Admin/Maintainer
 ↓
PATCH /projects/:projectId/members/:userId
 { role: "MAINTAINER" }
 ↓
authenticate
 ↓
authorize
 ↓
validate target membership
 ↓
transaction:
  update membership
  insert audit log
  insert ROLE_CHANGED outbox event
 ↓
commit
 ↓
worker sends email
 ↓
permission refresh
```

No account recreation.

## 9. Demotion flow

```text
Admin
 ↓
PATCH role = DEVELOPER
 ↓
transaction
 ↓
count active Maintainers
 ↓
if count == 1 → reject unless transfer is included
 ↓
update role
 ↓
audit
 ↓
outbox notification
 ↓
commit
```

A demoted user immediately becomes a Developer for authorization purposes.

## 10. Permission refresh

Do not rely only on an old frontend role.

After role mutation:
- invalidate permission cache if present
- update session claims if used
- frontend refetches `/me` or project permissions
- every protected API independently checks current DB-backed authorization

This ensures promotion/demotion takes effect without a new account.

## 11. Developer chat

```text
POST /projects/:projectId/conversations
POST /conversations/:conversationId/messages
```

Flow:

```text
Request
 ↓
Auth
 ↓
Project membership
 ↓
Conversation belongs to project?
 ↓
persist USER message
 ↓
AIProvider/mock provider
 ↓
persist ASSISTANT message
 ↓
response
```

V1 can use a mock AI response.

Later:

```text
AI Runtime
 ├── Project Context
 ├── RAG
 ├── GitHub tool
 ├── Jira tool
 ├── Confluence tool
 └── GeminiProvider
```

## 12. Temporary attachment flow

```text
POST /conversations/:id/attachments
 ↓
authorize conversation
 ↓
validate file size/type/name
 ↓
store file
 ↓
store attachment metadata
 ↓
processing status
```

The file is conversation-scoped.

It is not permanent project knowledge unless a later Maintainer workflow explicitly promotes it.

## 13. Source management

Maintainer:

```http
GET    /projects/:projectId/sources
POST   /projects/:projectId/sources
PATCH  /projects/:projectId/sources/:sourceId
DELETE /projects/:projectId/sources/:sourceId
```

V1 stores source configuration/state.

Actual sync workers can be added later.

## 14. Email architecture

Do not:

```text
API request → await SMTP → response
```

Use:

```text
API
 ↓
MongoDB transaction
 ↓
outbox_events
 ↓
worker
 ↓
EmailService
 ↓
Nodemailer
 ↓
SMTP
```

Worker requirements:
- idempotent processing
- retry with exponential backoff
- max attempts
- failure state
- structured logging

Possible later providers:
- AWS SES
- Resend
- SendGrid

## 15. API surface

### Auth
```http
POST /api/v1/auth/signup
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/verify-email
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

### Organizations
```http
POST /api/v1/organizations
GET  /api/v1/organizations/:organizationId
GET  /api/v1/organizations/:organizationId/overview
GET  /api/v1/organizations/:organizationId/users
```

### Projects
```http
POST  /api/v1/organizations/:organizationId/projects
GET   /api/v1/organizations/:organizationId/projects
GET   /api/v1/projects/:projectId
PATCH /api/v1/projects/:projectId
POST  /api/v1/projects/:projectId/archive
```

### Members
```http
GET    /api/v1/projects/:projectId/members
POST   /api/v1/projects/:projectId/members
PATCH  /api/v1/projects/:projectId/members/:userId
DELETE /api/v1/projects/:projectId/members/:userId
```

### Invitations
```http
POST /api/v1/projects/:projectId/invitations
POST /api/v1/invitations/:token/accept
POST /api/v1/invitations/:id/resend
POST /api/v1/invitations/:id/revoke
```

### Conversations
```http
GET  /api/v1/projects/:projectId/conversations
POST /api/v1/projects/:projectId/conversations
GET  /api/v1/conversations/:conversationId
POST /api/v1/conversations/:conversationId/messages
```

### Attachments
```http
POST   /api/v1/conversations/:conversationId/attachments
DELETE /api/v1/conversations/:conversationId/attachments/:attachmentId
```

### Sources
```http
GET    /api/v1/projects/:projectId/sources
POST   /api/v1/projects/:projectId/sources
PATCH  /api/v1/projects/:projectId/sources/:sourceId
DELETE /api/v1/projects/:projectId/sources/:sourceId
```

## 16. API security

Use:
- request schema validation
- authentication middleware
- centralized RBAC policies
- rate limiting
- secure headers
- CORS configuration
- request size limits
- file upload restrictions
- correlation IDs
- consistent error responses

Suggested error:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to manage this project."
  }
}
```

## 17. Concurrency and transactions

MongoDB transactions must protect:

### Role change
```text
membership update
+ audit
+ outbox
```

### Invitation acceptance
```text
validate invitation
+ mark accepted
+ create membership
+ audit
```

### Ownership transfer
```text
new Maintainer
+ old Maintainer demotion
+ audit
```

All must commit or roll back together.

## 18. Security invariants

### Last Admin
Never leave organization with zero Admins.

### Last Maintainer
Never leave active project with zero Maintainers without explicit ownership transfer.

### Project isolation
Every project resource must be queried with authorized `projectId`.

### User removal
Remove membership, not historical identity.

### Secrets
Never expose or log:
- passwords
- raw invitation tokens
- SMTP credentials
- integration credentials
- session secrets

## 19. Observability

V1 production baseline:

```http
GET /health
GET /ready
```

Use:
- structured logs
- request/correlation ID
- error tracking
- worker metrics/logs
- MongoDB query monitoring

Do not log sensitive payloads.

## 20. Testing strategy

Required automated tests:

### Unit
- RBAC policy
- invitation expiry
- last Admin rule
- last Maintainer rule
- role transitions
- validation

### Integration
- auth + MongoDB
- membership flows
- invitation acceptance
- role change + audit + outbox
- email worker retry

### Security
- cross-project access
- Developer calling Maintainer API
- removed member access
- expired invitation replay
- unauthorized role change

### End-to-end
- signup → organization → project
- invite → accept → project
- Developer → Maintainer
- Maintainer → Developer
- Admin dashboard reporting

## 21. Deployment shape

V1 can start as:

```text
React
  ↓
Node/Express API
  ↓
MongoDB

Node Worker
  ↓
SMTP
```

The worker may initially be a separate process from the API. Do not require Kafka for V1.

## 22. Future AI boundary

Use:

```ts
interface AIProvider {
  generateResponse(input: AIRequest): Promise<AIResponse>;
}
```

V1:
```text
MockAIProvider
```

Later:
```text
GeminiProvider
```

This keeps V1 independently testable and prevents Gemini-specific logic from leaking into membership/project services.
