---
type: concept
producer: oriel
status: active
created: 2026-09-22
updated:
expires: 2027-09-22
deprecatedReason: ""
supersededBy: ""
---

# Insured Detail (Drawer) Technical Specification

Contract definitions and frontend architecture to enable decoupled parallel development between `src/apps/client` and `src/apps/api`.

## 1. Endpoints Specification

### 1.1 Insured Profile & Active Policy
- **Endpoint**: `GET /insureds/:id`
- **Response Contract**: `InsuredDetailResponse` (`@copas/contracts`)
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`
- **Payload Shape**:
  ```json
  {
    "id": "019213ab-...",
    "organizationId": "019213ab-...",
    "uploadedBy": "019213ab-...",
    "cuit": "20123456789",
    "fullName": "JUAN CARLOS PEREZ",
    "phone": "+541112345678",
    "email": "juan@example.com",
    "birthDate": "1985-05-15",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "deletedAt": null,
    "companies": ["Sancor Seguros"],
    "activePoliciesCount": 1,
    "totalPoliciesCount": 1,
    "latestPolicy": {
      "id": "019213ab-...",
      "policyNumber": "POL-12345",
      "companyId": "019213ab-...",
      "companyName": "Sancor Seguros",
      "branchId": "019213ab-...",
      "branchName": "Automotores",
      "assetDescription": "Toyota Corolla 2022",
      "startDate": "2026-01-01",
      "endDate": "2027-01-01",
      "status": "active"
    }
  }
  ```

### 1.2 Update Insured Profile
- **Endpoint**: `PATCH /insureds/:id`
- **Request Contract**: `UpdateInsuredRequest` (`fullName?`, `cuit?`, `phone?`, `email?`, `birthDate?`)
- **Response**: `200 OK` with `InsuredResponse`
- **Errors**: `400 Bad Request` (zod errors), `409 Conflict` (duplicated CUIT in organization: `{ "error": "Conflict", "message": "CUIT already registered" }`)

### 1.3 Lazy Fetch Policies List
- **Endpoint**: `GET /policies?insuredId=:insuredId&limit=:limit&offset=:offset`
- **Query Contract**: `PoliciesFilter`
- **Response Contract**: `PoliciesDetailedResponse` (`items: PolicyDetailedItem[]`, `total: number`)
- **Status Codes**: `200 OK`

### 1.4 Update Policy
- **Endpoint**: `PUT /policies/:id` (or `PATCH /policies/:id`)
- **Request Contract**: `UpdatePolicyRequest` (`status?`, `policyNumber?`, `startDate?`, `endDate?`, `premiumTotal?`, `currency?`)
- **Response**: `200 OK` with `PolicyResponse`

### 1.5 Lazy Fetch Policy Installments
- **Endpoint**: `GET /installments?policyId=:policyId&status=all`
- **Query Contract**: `InstallmentsFilter`
- **Response Contract**: `InstallmentsDetailedResponse` (`items: InstallmentDetailedItem[]`)
- **Status Codes**: `200 OK`

### 1.6 Update Installment Status
- **Endpoint**: `PATCH /installments/:id`
- **Request Contract**: `UpdateInstallmentStatusRequest` (`{ status: "pending" | "paid" | "overdue" }`)
- **Response**: `200 OK` with `PolicyInstallmentResponse`

---

## 2. Frontend Architecture (`src/apps/client`)

### 2.1 URL Navigation Synchronization
- **State Management**: URL query parameter `?insuredId=<id>`.
- **Hook**: `useInsuredDrawer()`
  - Encapsulates `useSearchParams()`.
  - Exposes `isOpen`, `insuredId`, `open(id)`, `close()`.
  - Works transparently across `/cartera` and `/dashboard`.

### 2.2 Component Hierarchy
```
<InsuredDetailDrawer />
 ├── <DrawerHeader />               // Name, company tags, close button
 ├── <InsuredProfileCard />         // Contact & fiscal data with inline edit
 ├── <PolicyItemCard />             // Policy metadata + status selector + edit action
 │    └── <InstallmentsAccordion /> // Lazy-loaded via usePolicyInstallments(policyId)
 └── <AdditionalPoliciesSection /> // Lazy-loaded via usePolicies({ insuredId })
```

### 2.3 Query Cache Invalidation Matrix
| Mutation | Query Keys Invalidated | UI Synchronization |
|---|---|---|
| `PATCH /insureds/:id` | `['insureds']`, `['insured', id]` | Updates Cartera table row & Drawer header |
| `PUT /policies/:id` | `['insured', id]`, `['policies', { insuredId }]`, `['insureds']` | Updates policy status badge & Cartera counts |
| `PATCH /installments/:id` | `['installments']`, `['installments', { policyId }]` | Updates Dashboard due installments & Drawer |
