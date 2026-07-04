---
type: feature
---

# FetchData Feature

Fetches data from configured external systems, applies response transformation via the MappingService, and returns the result.

## Endpoint

```
GET /external-data/{ServiceName}/{OperationName}?Page=1&PageSize=20
```

| Parameter       | Source | Required | Description                                      |
|-----------------|--------|----------|--------------------------------------------------|
| `ServiceName`   | Route  | Yes      | TargetSystem identifier (alphanumeric + hyphens)  |
| `OperationName` | Route  | Yes      | Operation name on the target system               |
| `Page`          | Query  | No       | Page number (default: 1, must be > 0)             |
| `PageSize`      | Query  | No       | Items per page (default: 20, range: 1–100)        |

## Request Flow

```
GET /external-data/erp-system/get-invoices?Page=1&PageSize=50
  │
  ▼
FetchDataEndpoint (route binding + mediator dispatch)
  │
  ▼
FetchDataQueryValidator (input validation)
  │
  ▼
FetchDataHandler
  ├─ 1. IMappingService.GetOperationMappingAsync(ServiceName, OperationName)
  │     → Looks up TargetSystemOperation in the database
  │     → Returns OperationMapping (endpoint, method, headers, MappingId)
  │
  ├─ 2. ITargetSystemClient.ExecuteOperationAsync(mapping, { Page, PageSize })
  │     → Resolves TargetSystem config (base URL, auth, timeout)
  │     → Authenticates (ApiKey / BasicAuth / Bearer / OAuth2)
  │     → Executes HTTP request against the external system
  │
  ├─ 3. IPayloadTransformationService.TransformPayloadAsync(response, MappingId)
  │     → Calls MappingService API to transform the response
  │     → Returns data in the expected internal format
  │
  └─ 4. Returns transformed response as 200 OK
```

## Configuration Prerequisites

### 1. Register a TargetSystem

A `TargetSystem` record must exist in the database for the tenant:

| Field                | Example                              |
|----------------------|--------------------------------------|
| `Identifier`         | `erp-system`                         |
| `Name`               | `ERP System`                         |
| `BaseUrl`            | `https://api.erp-vendor.com`         |
| `AuthenticationType` | `ApiKey`, `BasicAuth`, `BearerToken`, `OAuth2ClientCredentials`, or `None` |
| `AuthenticationConfig` | JSON credentials (see below)       |
| `TimeoutSeconds`     | `60`                                 |
| `IsActive`           | `true`                               |

#### AuthenticationConfig examples

**ApiKey:**
```json
{ "ApiKey": "your-api-key", "HeaderName": "X-API-Key" }
```

**BasicAuth:**
```json
{ "Username": "user", "Password": "pass" }
```

**BearerToken:**
```json
{ "Token": "your-bearer-token" }
```

### 2. Register a TargetSystemOperation

Each fetchable operation needs a `TargetSystemOperation` record linked to the target system:

| Field             | Example                |
|-------------------|------------------------|
| `OperationName`   | `get-invoices`         |
| `TargetEndpoint`  | `/api/v2/invoices`     |
| `HttpMethod`      | `GET`                  |
| `Headers`         | `{}` (JSON)            |
| `MappingId`       | GUID from MappingService |
| `IsActive`        | `true`                 |

### 3. Configure a Mapping in MappingService

The `MappingId` on the operation must reference a valid mapping in the MappingService. This mapping defines how the external system's response is transformed into the internal data format.

The MappingService base URL is configured via `MappingService:BaseUrl` in appsettings (default: `http://localhost:5000`).

## Response Codes

| Code | Condition                                              |
|------|--------------------------------------------------------|
| 200  | Data fetched and transformed successfully              |
| 400  | Validation error (invalid ServiceName, OperationName, Page, or PageSize) |
| 404  | No mapping found for the given ServiceName + OperationName |
| 500  | External system error or transformation failure        |

## Adding a New External Data Source

1. Create a `TargetSystem` record with the external system's base URL and auth config
2. Create a `TargetSystemOperation` with `OperationName`, endpoint path, HTTP method, and a `MappingId`
3. Configure the response mapping in the MappingService
4. Call `GET /external-data/{your-identifier}/{your-operation}`

No code changes are needed — all routing and transformation is database-driven.
