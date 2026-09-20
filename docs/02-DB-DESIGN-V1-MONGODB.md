# Dev AI Workspace — V1 Database Design — MongoDB

## 1. Design principles

- MongoDB is the primary V1 database.
- Use separate collections for bounded entities.
- Do not embed unbounded messages/audit records.
- Project-owned data carries `projectId`.
- Organization-owned data carries `organizationId`.
- Roles are membership properties, never global User properties.
- Use unique indexes for identity/membership invariants.
- Use transactions for multi-document security/state transitions.

## 2. Collections

### users

```ts
{
  _id: ObjectId,
  email: string,
  name: string,
  passwordHash: string,
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DELETED",
  emailVerifiedAt?: Date,
  lastLoginAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```text
{ email: 1 } UNIQUE
{ status: 1 }
```

### auth_tokens

Used for verification, password reset and other short-lived flows.

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET",
  tokenHash: string,
  expiresAt: Date,
  consumedAt?: Date,
  createdAt: Date
}
```

Index:
```text
{ userId: 1, type: 1, consumedAt: 1 }
```

Never store raw tokens.

### sessions

If server-side session management is used:

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  sessionHash: string,
  expiresAt: Date,
  revokedAt?: Date,
  createdAt: Date,
  lastSeenAt: Date
}
```

Index:
```text
{ sessionHash: 1 } UNIQUE
{ expiresAt: 1 }
```

If a different secure session implementation is selected, retain equivalent revocation/expiry semantics.

### organizations

```ts
{
  _id: ObjectId,
  name: string,
  slug: string,
  createdBy: ObjectId,
  status: "ACTIVE" | "ARCHIVED",
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```text
{ slug: 1 } UNIQUE
{ status: 1 }
```

### organization_memberships

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  userId: ObjectId,
  role: "ADMIN" | "MEMBER",
  status: "ACTIVE" | "SUSPENDED" | "REMOVED",
  joinedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
  version: number
}
```

Indexes:
```text
{ organizationId: 1, userId: 1 } UNIQUE
{ organizationId: 1, role: 1, status: 1 }
{ userId: 1, status: 1 }
```

### projects

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  name: string,
  slug: string,
  description?: string,
  status: "ACTIVE" | "ARCHIVED",
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```text
{ organizationId: 1, slug: 1 } UNIQUE
{ organizationId: 1, status: 1 }
```

### project_memberships

```ts
{
  _id: ObjectId,
  projectId: ObjectId,
  userId: ObjectId,
  role: "MAINTAINER" | "DEVELOPER",
  status: "ACTIVE" | "SUSPENDED" | "REMOVED",
  joinedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
  version: number
}
```

Indexes:
```text
{ projectId: 1, userId: 1 } UNIQUE
{ projectId: 1, role: 1, status: 1 }
{ userId: 1, status: 1 }
```

### invitations

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  email: string,
  invitedRole: "MAINTAINER" | "DEVELOPER",
  tokenHash: string,
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED",
  invitedBy: ObjectId,
  expiresAt: Date,
  acceptedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```text
{ projectId: 1, email: 1, status: 1 }
{ expiresAt: 1 }
```

Resend should revoke/replace the previous pending invitation.

### conversations

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  userId: ObjectId,
  title?: string,
  status: "ACTIVE" | "ARCHIVED",
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```text
{ projectId: 1, userId: 1, updatedAt: -1 }
{ organizationId: 1, projectId: 1 }
```

### messages

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  conversationId: ObjectId,
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL",
  content: string,
  model?: string,
  inputTokens?: number,
  outputTokens?: number,
  createdAt: Date
}
```

Index:
```text
{ conversationId: 1, createdAt: 1 }
```

### conversation_attachments

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  conversationId: ObjectId,
  uploadedBy: ObjectId,
  fileName: string,
  mimeType: string,
  storageKey: string,
  sizeBytes: number,
  processingStatus: "PENDING" | "PROCESSING" | "READY" | "FAILED",
  expiresAt?: Date,
  createdAt: Date
}
```

Indexes:
```text
{ conversationId: 1, createdAt: -1 }
{ expiresAt: 1 }
```

MongoDB stores metadata; large binaries should use object storage when enabled.

### knowledge_sources

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  type: "GITHUB" | "JIRA" | "CONFLUENCE" | "MANUAL",
  name: string,
  status: "CONNECTED" | "SYNCING" | "ERROR" | "DISCONNECTED",
  configEncrypted?: string,
  lastSyncedAt?: Date,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

Index:
```text
{ projectId: 1, type: 1, status: 1 }
```

### audit_logs

```ts
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId?: ObjectId,
  actorUserId: ObjectId,
  action: string,
  targetType?: string,
  targetId?: ObjectId,
  metadata?: Record<string, unknown>,
  createdAt: Date
}
```

Indexes:
```text
{ organizationId: 1, createdAt: -1 }
{ projectId: 1, createdAt: -1 }
{ actorUserId: 1, createdAt: -1 }
```

Append-only.

### outbox_events

```ts
{
  _id: ObjectId,
  organizationId?: ObjectId,
  eventType: string,
  aggregateType: string,
  aggregateId: ObjectId,
  payload: Record<string, unknown>,
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED",
  attempts: number,
  nextAttemptAt?: Date,
  processedAt?: Date,
  createdAt: Date
}
```

Indexes:
```text
{ status: 1, nextAttemptAt: 1 }
{ aggregateType: 1, aggregateId: 1 }
```

## 3. Data invariants

### Last Admin
Active organization Admin count must remain >= 1.

### Last Maintainer
Active project Maintainer count must remain >= 1 unless explicit ownership transfer occurs.

### Unique membership
One active logical membership per user/project.

### Project isolation
Every project-owned query must include authorized project scope.

## 4. Transaction examples

### Organization creation

```text
transaction
 ├── create organization
 └── create ADMIN organization membership
commit
```

### Invitation acceptance

```text
transaction
 ├── validate pending invitation
 ├── create/reactivate project membership
 ├── mark invitation accepted
 └── create audit log
commit
```

### Role change

```text
transaction
 ├── authorize actor
 ├── validate target
 ├── validate last-role invariant
 ├── update membership/version
 ├── insert audit log
 └── insert outbox event
commit
```

### Ownership transfer

```text
transaction
 ├── promote new Maintainer
 ├── demote old Maintainer
 ├── audit
 └── outbox
commit
```

## 5. Admin reporting

Use MongoDB aggregation for:
- total users
- active users
- pending invitations
- project count
- role counts
- project-wise members
- recent role changes

Do not maintain derived counters in V1 unless profiling proves necessary.

## 6. Future collections

Later versions can add:

```text
source_documents
source_versions
knowledge_chunks
embedding_records
sync_jobs
webhook_events
tool_calls
agent_runs
model_usage
evaluation_runs
```

The V1 identity/project model does not need to change.
