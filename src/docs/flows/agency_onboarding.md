---
type: convention
producer: agent/gemini-3.1-pro-high
status: active
created: 2026-08-28
updated:
expires: 2027-08-28
deprecatedReason: ""
supersededBy: ""
---

# Agency Onboarding Flow

## Technical Implementation

- **Core Dependency:** Endpoints and sessions are handled natively by Better Auth (`admin` and `organization` plugins).
- **Slug Generation:** Frontend SDK (`authClient.organization.create`) sends only the `name`. A Better Auth backend hook intercepts to auto-generate a unique `slug`.
- **UI Components:** Strictly use `shadcn` components from `src/packages/ui`.
- **Authentication:** OAuth only. Email/password inputs are hidden from the public client.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber

    actor PAS as PAS (User)
    participant Client as Web Client (SPA)
    participant API as Backend (Better Auth Plugins)
    participant OAuth as OAuth Provider (Google / Microsoft)
    participant DB as Database

    %% --- 1. OAuth Authentication ---
    PAS->>Client: Click "Continue with Google / Microsoft"
    Client->>API: GET /auth/sign-in/social?provider=google|microsoft
    API-->>Client: 302 Redirect
    Client->>OAuth: Consent
    OAuth-->>Client: Redirect with code
    Client->>API: POST /auth/callback/social (code, state)
    API->>OAuth: Exchange code
    OAuth-->>API: 200 OK (Profile Data)

    %% --- 2. Persistence ---
    API->>DB: UPSERT User & Account
    API->>DB: CREATE Session
    API-->>Client: 200 OK (Set HttpOnly Cookie)

    %% --- 3. Organization Verification ---
    Client->>API: GET /auth/organization/list
    API->>DB: SELECT * FROM member WHERE userId = :userId
    DB-->>API: List of memberships

    alt Case A: User has an Agency
        API-->>Client: 200 OK { organizations, activeOrg }
        Client->>API: POST /auth/organization/set-active { organizationId }
        API-->>Client: 200 OK
        Client->>PAS: Render Dashboard

    else Case B: New user
        API-->>Client: 200 OK { organizations: [] }
        Client->>PAS: Render Onboarding ("Create Agency")
        PAS->>Client: Inputs agency `name` ONLY
        Client->>API: POST /auth/organization/create { name }
        Note right of API: Backend Hook generates unique `slug`
        API->>DB: INSERT organization & member (role: 'owner')
        API->>DB: UPDATE Session (activeOrganizationId)
        API-->>Client: 201 Created
        Client->>PAS: Render Dashboard
    end
```
