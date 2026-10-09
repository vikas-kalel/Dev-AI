# Dev AI Workspace — V1 UI Design

## 1. Purpose

This document is the UI source of truth for V1 and is intended to be used with Google Stitch.

Existing Stitch project:
https://stitch.withgoogle.com/projects/8673693144479793138

Use the existing Stitch project as the visual reference.

Preserve its visual language where applicable:
- typography
- spacing
- color system
- navigation
- cards
- buttons
- forms
- responsive behavior

The generated screens must map cleanly to React + TypeScript + Tailwind CSS.

## 2. Product UX principle

The product is a developer workspace, not a generic chatbot/dashboard.

Developer's primary action:

> Chat with your project.

Do not expose RAG, embeddings, vector DB, MCP, agents or tool-calling as normal Developer navigation.

## 3. Role navigation

### Admin
```text
Overview
Projects
Users
Settings
```

### Maintainer
```text
Chat
Knowledge
Sources
Members
Settings
```

### Developer
```text
Chat
```

## 4. Screens

### Authentication

1. Login
2. Signup
3. Email verification
4. Forgot password
5. Reset password

Login routing:
- no organization → onboarding
- one project → optionally open it
- multiple projects → project selection
- pending invitation → invitation handling

### Organization onboarding

```text
Create your organization
Organization name
Slug
[Create organization]
```

### Project selection

Cards:

```text
Payment Platform
Maintainer
[Open workspace]

AI Platform
Developer
[Open workspace]
```

### Admin overview

Metrics:

```text
Total Users
Active Users
Projects
Maintainers
Developers
Pending Invitations
```

Project breakdown table.

Recent activity:
- role changes
- invitations
- removals

### Admin Users

Columns:
```text
Name
Email
Project
Role
Status
Actions
```

Filters:
- project
- role
- status

Actions:
- Developer → Maintainer
- Maintainer → Developer
- Remove access

### Developer Chat

```text
Payment Platform

Project AI

Ask anything about this project.

[message list]

[+ Attach] Ask about this project... [Send]
```

States:
- empty
- loading
- success
- error
- permission denied

### Maintainer Chat

Same chat experience plus Maintainer navigation.

### Members

```text
Members
[+ Invite Member]

Name | Email | Role | Status | Actions
```

Actions:
- change role
- remove
- resend pending invitation

### Invite dialog

```text
Invite member
Email
Project
Role: Developer / Maintainer
[Cancel] [Send invitation]
```

### Role dialog

Developer → Maintainer:

```text
Change role
Amit
Payment Platform

Current: Developer
New role:
○ Developer
● Maintainer

[Cancel] [Confirm]
```

Maintainer → Developer uses equivalent dialog.

Last-Maintainer protection:

```text
Cannot change role
This project must retain at least one Maintainer.
Assign another Maintainer first.
```

### Remove dialog

```text
Remove Amit from Payment Platform?

Amit will immediately lose project access.
Historical conversations and audit records will remain.

[Cancel] [Remove]
```

### Knowledge Sources

Cards:
- GitHub
- Jira
- Confluence
- Manual documents

Show:
- connection status
- last sync
- manage
- disconnect

### Knowledge

Maintainer-only:

```text
Project Knowledge
Search...
Architecture
Requirements
ADRs
Documentation
Uploaded documents
[+ Add document]
```

Clearly distinguish permanent knowledge from temporary chat attachments.

### Project Settings

Sections:
- General
- Access
- Knowledge
- Integrations
- Project status

Archive confirmation:

```text
Archive Payment Platform?

The project will stop accepting new members and new work.

[Cancel] [Archive]
```

## 5. Email/invitation UI states

Success:
```text
Invitation sent to amit@example.com
```

Delivery failure:
```text
Access was created, but the notification email could not be delivered.
[Resend]
```

Expired:
```text
This invitation has expired.
Ask an administrator to send a new invitation.
```

## 6. Role-change UI behavior

After successful mutation:
- update role
- refresh relevant queries
- show success toast
- show notification queued/delivered status if available

Do not assume SMTP success just because the role mutation succeeded.

## 7. Removal behavior

After removal:
- success toast
- refresh member list
- if current user was removed, clear project UI state and route to `/projects`

## 8. File upload UI

Show:
- selected filename
- file type
- size
- upload progress
- processing status
- remove/retry

Message:

> Used as context for this conversation.

Never show internal storage keys.

## 9. Source connection UI

Flow:

```text
Add Source
 → GitHub/Jira/Confluence
 → configuration form
 → Connecting
 → Connected / Error
```

Error:
```text
Connection failed.
Check credentials and permissions.
[Retry]
```

## 10. Responsive design

Desktop:
- persistent sidebar
- top organization/project selector
- main workspace

Tablet:
- collapsible sidebar

Mobile:
- compact project selector
- compact navigation
- chat-first design

Tables should adapt into cards or accessible horizontal scrolling.

## 11. Accessibility

All screens must include:
- keyboard navigation
- visible focus
- semantic controls
- accessible dialogs
- associated form labels
- field-level errors
- sufficient contrast
- accessible loading feedback

## 12. Stitch generation prompt

```text
Design a production-grade SaaS application called "Dev AI Workspace".

Use the existing Stitch project as the primary visual reference:
https://stitch.withgoogle.com/projects/8673693144479793138

Preserve the existing visual language, typography, spacing, color system, component patterns, navigation behavior and responsive behavior.

The product is a project-centric engineering workspace.

Organization model:
- Organization contains multiple projects.
- Users can belong to multiple projects.
- Project roles are Maintainer and Developer.
- Organization Admin is the organization-level authority.
- A user may be Maintainer in one project and Developer in another.

Admin screens:
- Overview
- Projects
- Users
- Settings

Admin capabilities:
- total/active users
- project count
- role counts
- pending invitations
- project-wise user counts
- role changes Developer ↔ Maintainer
- remove project access
- recent activity

Maintainer screens:
- Chat
- Knowledge
- Sources
- Members
- Settings

Maintainer capabilities:
- manage Developers
- role changes within allowed project authority
- manage permanent project knowledge
- manage GitHub/Jira/Confluence source connections

Developer screens:
- Chat
- temporary conversation file attachments

Developer should not see RAG, embeddings, vector database, MCP, agents or tool calling.

Generate:
1. Login
2. Signup
3. Email verification
4. Forgot password
5. Reset password
6. Organization onboarding
7. Project selection
8. Admin Overview
9. Admin Users
10. Developer Chat
11. Maintainer Chat
12. Members
13. Invite Member dialog
14. Change Role dialog
15. Remove Member confirmation
16. Knowledge
17. Knowledge Sources
18. Add Source
19. Project Settings
20. Loading/empty/error/success/permission states

Use safe confirmation UX for role changes, removals and archive actions.

Design for React + TypeScript + Tailwind CSS.

Make the application feel like a serious developer product rather than a generic AI chatbot or generic dashboard.

Use responsive desktop/tablet/mobile layouts and accessible interactions.
```

## 13. Dummy screen behavior

### Login
Login → load session → route according to organization/project state.

### Signup
Signup → verification → login.

### Organization
Create organization → Admin dashboard/project setup.

### Project
Create project → project selection → workspace.

### Admin role update
Select user → change role → confirm → API mutation → refresh data → toast.

### Maintainer demotion
Confirm → API → permission refresh → management navigation disappears.

### Last Maintainer
Attempt → backend returns `LAST_MAINTAINER` → show ownership message.

### Invitation
Invite → pending state → asynchronous email state → resend/revoke.

### Chat
Send → loading → mock response.

### Attachment
Attach → validate → upload → show chip/status → use in current conversation.

### Source
Add → configure → connecting → connected/error.

### Removal
Confirm → revoke membership → redirect removed current user.

### Archive
Confirm → archive → remove project from active list.

## 14. Stitch-to-code rule

Stitch output is visual implementation guidance, not the source of authorization/business rules.

When converting to React:
- preserve visual design
- use React Query for server state
- use Zustand only for client state
- connect forms to V1 API contracts
- preserve all specified loading/error/empty states
- never implement security only by hiding UI.
