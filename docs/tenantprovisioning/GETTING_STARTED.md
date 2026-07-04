---
type: howto
---

# Getting Started with Tenant Provisioning Service

## Quick Start

### 1. Build the Solution

```powershell
cd c:\Projects\Processity.TenantProvisioning
dotnet build
```

### 2. Create Database and Run Migrations

```powershell
# Create the database (if it doesn't exist)
createdb provisioning

# Navigate to migrations project
cd Service\migration\TenantProvisioning.Migrations

# Create initial migration
dotnet ef migrations add InitialCreate --startup-project ..\..\..\ Host\Host.csproj

# Apply migrations
dotnet ef database update --startup-project ..\..\..\Host\Host.csproj
```

### 3. Seed Module Registry

After starting the service, you can seed the module registry via the API. Example PowerShell script:

```powershell
$baseUrl = "http://localhost:5010"

# Register CoreData module
$coreDataModule = @{
    ModuleName = "CoreData"
    DisplayName = "Core Data Module"
    Description = "Core data and common entities"
    ConnectionString = "Host=localhost;Database=coredata;Username=postgres;Password=postgres"
    MigrationAssembly = "CoreData.Migrations"
    DbContextType = "CoreDataDbContext"
    RequiresLicense = $false
    IsTenantScoped = $true
    ExecutionOrder = 1
    IsActive = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/api/v1/provisioning/modules" `
    -Method Post `
    -Body $coreDataModule `
    -ContentType "application/json"

# Register Authentication module
$authModule = @{
    ModuleName = "Authentication"
    DisplayName = "Authentication Service"
    Description = "User authentication and authorization"
    ConnectionString = "Host=localhost;Database=authentication;Username=postgres;Password=postgres"
    MigrationAssembly = "Authentication.Migrations"
    DbContextType = "TenantScopedDbContext"
    RequiresLicense = $false
    IsTenantScoped = $true
    ExecutionOrder = 2
    IsActive = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/api/v1/provisioning/modules" `
    -Method Post `
    -Body $authModule `
    -ContentType "application/json"
```

### 4. Run the Service

```powershell
cd Host
dotnet run
```

The service will be available at:

- API: http://localhost:5010
- Swagger: http://localhost:5010/swagger

### 5. Create a Test Provisioning Request

```powershell
$request = @{
    TenantIdentifier = "test-tenant"
    TenantName = "Test Tenant Corporation"
    KeyVaultProjectId = "test-kv-proj"
    AdminEmail = "admin@test-tenant.com"
    AdminName = "Test Admin"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5010/api/v1/provisioning/requests" `
    -Method Post `
    -Body $request `
    -ContentType "application/json"

Write-Host "Created provisioning request: $($response.Id)"

# Approve the request (example using admin API)
Invoke-RestMethod -Uri "http://localhost:5010/api/v1/admin/requests/$($response.Id)/approve" `
    -Method Post
```

## Development Workflow

### Adding a New Module

1. Register the module via API:

```powershell
POST /api/v1/provisioning/modules
{
    "ModuleName": "MyModule",
    "DisplayName": "My Module",
    "ConnectionString": "...",
    "MigrationAssembly": "MyModule.Migrations",
    "DbContextType": "MyModuleDbContext",
    "ExecutionOrder": 10,
    "IsActive": true
}
```

2. The module will automatically be included in future provisioning requests

### Monitoring Provisioning

Check provisioning status:

```powershell
$requestId = "your-request-id"
$status = Invoke-RestMethod -Uri "http://localhost:5010/api/v1/provisioning/requests/$requestId"
$status | ConvertTo-Json -Depth 10
```

### Rollback Failed Provisioning

```powershell
Invoke-RestMethod -Uri "http://localhost:5010/api/v1/provisioning/requests/$requestId/rollback" `
    -Method Post
```

## Configuration

### appsettings.json

```json
{
  "ConnectionStrings": {
    "ProvisioningDb": "Host=localhost;Database=provisioning;Username=postgres;Password=postgres"
  },
  "Services": {
    "AuthenticationService": "http://localhost:5000"
  },
  "Cors": {
    "AllowedOrigins": ["http://localhost:4200"]
  }
}
```

### Environment Variables

You can also use environment variables:

```powershell
$env:ConnectionStrings__ProvisioningDb = "Host=localhost;..."
$env:Services__AuthenticationService = "http://localhost:5000"
```

## Troubleshooting

### Connection Issues

If you get connection errors to other services:

1. Verify authentication service is running
2. Check connection strings in module registry
3. Review logs in `Host` project

### Migration Errors

If migrations fail during provisioning:

1. Check that migration assemblies are correctly named
2. Verify connection strings have correct permissions
3. Review step execution logs

### Admin Integration & Webhooks

This service no longer includes a built-in Blazor admin UI. Instead, external admin apps (Angular, React, server-side dashboards, or other services) should integrate with the following admin API endpoints:

- `GET /api/v1/admin/requests/pending` — list requests awaiting approval
- `POST /api/v1/admin/requests/{id}/approve` — approve and start provisioning
- `POST /api/v1/admin/requests/{id}/reject` — reject with reason
- `POST /api/v1/admin/webhooks/approval` — webhook endpoint for automated approvals/rejections from external systems

Example webhook payload (JSON):

```json
{
  "requestId": "00000000-0000-0000-0000-000000000000",
  "action": "approve",
  "reason": null,
  "source": "external-approval-service"
}
```

Recommended webhook security: HMAC signature using a shared secret. Example `curl` to call the webhook (bash):

```bash
SHARED_SECRET="super-secret"
PAYLOAD='{"requestId":"00000000-0000-0000-0000-000000000000","action":"approve"}'
SIGNATURE=$(printf "%s" "$PAYLOAD" | openssl dgst -sha256 -hmac "$SHARED_SECRET" -binary | xxd -p -c 256)

curl -X POST https://localhost:5010/api/v1/admin/webhooks/approval \
    -H "Content-Type: application/json" \
    -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
    -d "$PAYLOAD"
```

On the server side, validate `X-Hub-Signature-256` using the same shared secret before acting on the webhook.

If your callers can obtain tokens from your auth server, prefer OAuth2 client credentials instead of shared HMAC secrets. Example flow:

1. Machine client requests a token (client credentials):

```bash
curl -X POST https://auth.example.com/connect/token \
  -d "grant_type=client_credentials&client_id=svc-provisioner&client_secret=SECRET&scope=provisioning:webhook"
```

Response contains `access_token`.

2. Call webhook with bearer token:

```bash
curl -X POST https://localhost:5010/api/v1/admin/webhooks/approval \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"requestId":"00000000-0000-0000-0000-000000000000","action":"approve"}'
```

This project enforces the `provisioning:webhook` scope for webhook clients. Use the auth server to issue client credentials for each machine client.

## Next Steps

1. Integrate with your Angular app or other admin dashboards via the admin API
2. Add email notifications for approval workflow
3. Configure production connection strings
4. Set up monitoring and alerting
5. Add custom seed data scripts for your modules
