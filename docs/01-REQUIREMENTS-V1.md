# Dev AI Workspace — V1 Requirements

## 0. Implementation contract

This document is the functional source of truth for V1.

### V1 stack
- Frontend: React, TypeScript, Zustand, TanStack React Query, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: MongoDB
- Email: Nodemailer + SMTP
- AI: not integrated in V1; use a provider boundary/mock implementation
- UI generation: Google Stitch using the UI design document

### V1 delivery philosophy

Implement incrementally in this order:

```text
V1.1 Authentication
V1.2 Organization onboarding
V1.3 Project creation/selection
V1.4 Membership + RBAC
V1.5 Invitations + email
V1.6 Admin/Maintainer management
V1.7 Project workspace + chat shell
V1.8 Temporary file context
V1.9 Knowledge-source foundation
V1.10 Jira/GitHub/Confluence connection foundations
V1.11 Production hardening
```

Do not implement advanced AI/RAG/agent features yet.

---

# 1. Product

Dev AI Workspace is a project-centric engineering workspace.

An organization contains multiple projects. Maintainers establish project context. Developers join projects and use the workspace primarily through project-aware chat.

The architecture must be scalable enough that later versions can add:

- Gemini
- RAG
- embeddings/vector search
- GitHub/Jira/Confluence ingestion
- live tools
- LangChain/LangGraph
- MCP
- agents
- memory

without redesigning identity, organization, project, membership or authorization.

---

# 2. Identity and authentication

## 2.1 Signup

A user can create an account with:
- name
- email
- password

Requirements:
- normalize email
- enforce unique email
- hash password using Argon2id or bcrypt
- create user in `PENDING_VERIFICATION` or equivalent state
- send verification email
- rate-limit signup
- never log password or raw verification token

## 2.2 Login

```text
Login
 ↓
validate credentials
 ↓
create authenticated session
 ↓
load organization/project membership
 ↓
route according to state
```

Possible states:

```text
No organization → organization onboarding
One accessible project → optionally open project
Multiple projects → project selection
Pending invitation → invitation handling
```

Login must not automatically grant organization access.

## 2.3 Session

Use a secure session strategy.

Preferred V1 browser approach:
- HTTP-only secure cookie
- SameSite configured appropriately
- short-lived authenticated session/access state
- refresh/session renewal where required

Do not store sensitive authentication tokens in localStorage.

## 2.4 Logout

Logout must invalidate the active session.

## 2.5 Verification / password recovery

V1 should include:
- email verification
- forgot password
- reset password
- expired/revoked reset tokens

These were previously under-specified and are required for a production-grade authentication baseline.

---

# 3. Organization

## 3.1 Organization creation

A verified user with no organization can:

```text
Create Organization
 ↓
Organization created
 ↓
Creator becomes Organization Admin
```

Organization creation must atomically create:
- organization
- organization membership with `ADMIN`

## 3.2 Organization membership

Organization-level roles:

```text
ADMIN
MEMBER
```

Project roles are separate.

A user may be:

```text
Organization: MEMBER
Project A: MAINTAINER
Project B: DEVELOPER
```

## 3.3 Admin

Admin can:
- view organization users
- view project-wise users
- view role/status counts
- create projects
- archive projects
- add/remove project members
- change project Developer ↔ Maintainer
- manage organization membership
- view audit activity

Admin cannot be removed if they are the last Admin.

---

# 4. Projects

## 4.1 Create project

Admin can create:

- name
- slug
- description

Project starts as:

```text
ACTIVE
```

## 4.2 Project selection

If multiple projects are available:

```text
My Projects
- Payment Platform — Maintainer
- AI Platform — Developer
```

Selecting a project establishes project context for the application.

The selected project is not itself an authorization boundary. Every backend request must still verify membership.

## 4.3 Project lifecycle

```text
ACTIVE
ARCHIVED
```

Archive rather than destructive delete for V1.

Archived project:
- cannot accept new members
- cannot create new conversations
- cannot connect new sources
- historical records remain

---

# 5. Roles and permissions

## 5.1 Developer

Can:
- access assigned project
- chat
- upload temporary conversation files
- view own conversations

Cannot:
- manage members
- change roles
- manage permanent project knowledge
- manage integrations
- archive project

## 5.2 Maintainer

Can:
- do everything Developer can
- invite/add Developers
- remove Developers
- manage project knowledge
- manage project sources
- connect/update/disconnect GitHub/Jira/Confluence
- manage allowed project settings
- manage project membership within policy

Maintainer cannot:
- make themselves Organization Admin
- change organization authority
- bypass project isolation

## 5.3 Admin

Admin has organization-level authority and can manage project roles:

```text
Developer → Maintainer
Maintainer → Developer
```

## 5.4 Last Maintainer

A project must not accidentally reach zero Maintainers.

Role removal/demotion must:
- reject if target is last Maintainer, OR
- perform explicit ownership transfer in one transaction

## 5.5 Last Admin

Organization must never reach zero Admins.

---

# 6. Membership lifecycle

States:

```text
PENDING
ACTIVE
SUSPENDED
REMOVED
```

A removed membership is retained for history.

Removing a project membership immediately revokes project access.

A removed user can later be re-added through a new membership flow.

---

# 7. Invitations

Invitation states:

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

Requirements:
- cryptographically random token
- store token hash only
- expiration
- one-time acceptance
- resend replaces/revokes previous pending invitation
- prevent duplicate pending invitations
- acceptance is transactional
- email delivery is asynchronous
- invitation acceptance cannot grant access to a different project

If the invited email already belongs to a user, acceptance should attach project membership to that user.

If it does not, the invitation flow leads to account creation and then acceptance.

---

# 8. Email notifications

Notify on:
- invitation
- promotion
- demotion
- optional removal

Architecture:

```text
Domain transaction
 ↓
Outbox event
 ↓
Worker
 ↓
EmailService
 ↓
Nodemailer + SMTP
```

Email failure must not roll back membership/role changes.

Retry with backoff and allow manual resend.

---

# 9. Admin reporting

Admin must be able to see:

```text
Total users
Active users
Pending invitations
Total projects
Maintainers
Developers
```

Project breakdown:

```text
Project
Total members
Maintainers
Developers
Active/Pending
```

Filters:
- project
- role
- status

Use aggregation initially; do not maintain fragile counters prematurely.

---

# 10. Project workspace

Developer UX should be intentionally simple:

> Chat with your project.

Do not expose:
- RAG
- embeddings
- vector DB
- MCP
- agent
- tool calling

as normal Developer features.

Maintainer/Admin may have management screens, but AI infrastructure remains internal.

---

# 11. Conversations

Conversation belongs to exactly one project and one user.

Requirements:
- create/list/open/archive conversation
- persist user and assistant messages
- project authorization on every request
- never expose another project's conversation by changing an ID

V1 can use a mock AI provider.

---

# 12. Temporary files

Developer can attach supported files to a conversation.

Requirements:
- size limit
- MIME/extension allowlist
- safe filenames
- storage metadata
- processing status
- cleanup/expiration
- authorization
- no execution of uploaded files

Temporary attachments do not become permanent project knowledge automatically.

Large file binaries should not be stored directly in MongoDB; store object-storage metadata so V1 can later move to S3/R2/GCS.

---

# 13. Knowledge-source foundation

V1 defines a scalable abstraction:

```text
GITHUB
JIRA
CONFLUENCE
MANUAL
```

Maintainer can:
- add source
- update source
- disconnect source
- view status
- view last sync

V1 connection screens should be implemented, but full ingestion/RAG is a later version.

Source status:

```text
CONNECTED
SYNCING
ERROR
DISCONNECTED
```

Credentials must be encrypted at rest.

---

# 14. Security

Backend is the security boundary.

Every project request verifies:

```text
authenticated user
 → organization membership
 → project membership
 → role
 → permission
```

Project scope must be enforced on:
- APIs
- MongoDB queries
- conversations
- attachments
- knowledge
- integrations
- future AI retrieval/tools

Additional requirements:
- rate limiting
- validation
- secure headers
- CORS
- request size limits
- secure cookies
- CSRF protection where applicable
- correlation IDs
- secret-safe logging

---

# 15. Concurrency and consistency

Use MongoDB transactions for:
- organization creation + admin membership
- invitation acceptance + membership
- role change + audit + outbox
- ownership transfer
- other multi-document security invariants

Use unique indexes and optimistic concurrency/version checks.

---

# 16. Audit

Audit:
- organization creation
- project creation/archive
- invitations
- member add/remove
- role changes
- source connect/update/disconnect
- knowledge changes

Audit logs are append-only.

---

# 17. Observability

V1 production baseline:
- structured logs
- correlation/request ID
- health endpoint
- readiness endpoint
- worker failure visibility
- error tracking

Never log passwords, raw tokens or integration credentials.

---

# 18. API quality

Use:
- versioned API `/api/v1`
- consistent error contract
- request validation
- pagination for users/members/conversations/audit
- filtering/sorting where needed
- idempotency for retry-sensitive mutations where appropriate

Example:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to manage this project."
  }
}
```

---

# 19. V1 exclusions

Do not implement yet:
- Gemini
- RAG
- embeddings
- vector DB
- LangChain
- LangGraph
- MCP
- multi-agent
- memory
- fine-tuning
- audio/video
- billing
- enterprise SSO
- multi-organization membership

---

# 20. V1 acceptance

V1 is accepted when:
- signup/login/verification/recovery work
- organization creation works atomically
- Admin is created correctly
- projects can be created/selected/archived
- membership and role rules work
- Developer ↔ Maintainer changes work
- last Admin/Maintainer protections work
- invitations are secure and recoverable
- email delivery is asynchronous
- Admin reporting works
- removed users immediately lose access
- project isolation tests pass
- temporary files are safe and scoped
- source connection foundation exists
- audit and observability exist
- critical flows are covered by automated tests
