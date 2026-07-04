---
type: howto
---

# InitEventBus Script Guide

## Overview

The `InitEventBus.sql` script initializes the event bus database schema by creating two core tables (`published` and `received`) that are used by the CAP (Cloud-native Application Program interface) library for handling distributed transactions and asynchronous event messaging in Processity microservices.

## What the Script Does

The script creates the following database objects in a specified PostgreSQL schema:

### 1. **Published Messages Table** (`published`)

Stores messages published by the current service that need to be sent to other services or external systems.

**Columns:**

- `Id` - Unique identifier (BIGSERIAL, Primary Key)
- `Name` - Event/message name (VARCHAR 200, required)
- `GroupName` - Optional grouping for related events (VARCHAR 200)
- `Content` - Serialized message payload (TEXT)
- `Retries` - Number of retry attempts (INT, default 0)
- `Added` - Timestamp when created (default: now())
- `ExpiresAt` - Optional expiration timestamp
- `StatusName` - Current status: 'Scheduled', 'Succeeded', 'Failed' (default: 'Scheduled')
- `ContentType` - MIME type of the content (VARCHAR 100)
- `Version` - Message version (VARCHAR 50)
- `Callback` - Optional callback endpoint (TEXT)

### 2. **Received Messages Table** (`received`)

Stores messages received from other services that have been consumed by this service.

**Columns:**

- `Id` - Unique identifier (BIGSERIAL, Primary Key)
- `Name` - Event/message name (VARCHAR 200, required)
- `GroupName` - Optional grouping for related events (VARCHAR 200)
- `Content` - Serialized message payload (TEXT)
- `Retries` - Number of retry attempts (INT, default 0)
- `Added` - Timestamp when created (default: now())
- `ExpiresAt` - Optional expiration timestamp
- `StatusName` - Current status (default: 'Succeeded')
- `ContentType` - MIME type of the content (VARCHAR 100)
- `Version` - Message version (VARCHAR 50)
- `DeliverCount` - Number of delivery attempts (INT, default 0)

## Using the Script in Each Module

### Modules Using Event Bus

The following Processity modules use the event bus and require the InitEventBus schema:

1. **Processity.EventBus** - Core event bus implementation
2. **Processity.Backend** (SolarCare module and others)
3. **Processity.FileService**
4. **Processity.LoggingService**
5. **Processity.ProcessInsightsService**
6. **Processity.BillingService**
7. **Processity.Terminal**
8. Other services that need inter-service communication

### Database Setup Per Module

Each module that uses CAP maintains its own event bus database separate from its main application database. The typical setup includes:

```
Module Structure:
├── Main Database: Contains application-specific tables
└── Event Bus Database: Contains only 'published' and 'received' tables
```

### Connection String Configuration

Event bus connections are configured in `appsettings.json` with the format:

```json
{
  "ConnectionStrings": {
    "EventBusDb": "Host=<host>;Database=EventBusDb;User ID=<user>;Password=<password>;"
  }
}
```

Example for different environments:

**Local Development:**

```json
"EventBusDb": "Host=localhost;Database=EventBusDb;User ID=postgres;Password=postgres123;"
```

**Docker Local:**

```json
"EventBusDb": "Host=processity-backend-db-local;Database=EventBusDb;User ID=postgres;Password=postgres123;"
```

**Production:**

```json
"EventBusDb": "Host=prod-db-server;Database=EventBusDb;User ID=eventbus_user;Password=${SECRET_PASSWORD};"
```

## Executing the Script

### Method 1: Direct PostgreSQL Execution (Local Development)

**On Linux/Mac:**

```bash
psql -h localhost -U postgres -d EventBusDb -f ./migration/Scripts/InitEventBus.sql
```

**On Windows (PowerShell):**

```powershell
$pgPassword = "postgres123"
$env:PGPASSWORD = $pgPassword
psql -h localhost -U postgres -d EventBusDb -f ".\migration\Scripts\InitEventBus.sql"
```

**With Custom Schema:**

```bash
psql -h localhost -U postgres -d EventBusDb \
  -v SCHEMA=eventbus_schema \
  -f ./migration/Scripts/InitEventBus.sql
```

### Method 2: Using Docker Containers

#### Getting Container Name

```bash
docker ps | grep postgres
# or
docker compose ps
```

#### Executing Via docker exec

**For Backend Event Bus:**

```bash
docker exec -it processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -f /docker-entrypoint-initdb.d/InitEventBus.sql
```

**With Custom Schema Variable:**

```bash
docker exec -it processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -v SCHEMA=tenant_schema \
  -c "CREATE SCHEMA IF NOT EXISTS tenant_schema;" \
  -f /docker-entrypoint-initdb.d/InitEventBus.sql
```

**From Host Machine (passing script content):**

```bash
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  < ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql
```

#### Mounting Script During Docker Startup

**docker-compose.yml:**

```yaml
core-db:
  image: postgres
  container_name: processity-backend-db-local
  ports:
    - 5433:5432
  environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASS}
  volumes:
    - ./Processity.SharedKernel/migration/Scripts:/docker-entrypoint-initdb.d
    - processity-data-local:/var/lib/postgresql/data
```

Then the script will auto-execute when the container starts:

```bash
docker compose up core-db
```

### Method 3: Application-Level Migration (EF Core)

The application can automatically create the schema on startup if configured properly:

**In Program.cs (Startup):**

```csharp
// Using Entity Framework Core migrations
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<EventBusDbContext>();
    dbContext.Database.Migrate(); // Applies pending migrations
}
```

**Or with raw SQL:**

```csharp
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<EventBusDbContext>();
    var connection = dbContext.Database.GetDbConnection();
    connection.Open();

    using (var command = connection.CreateCommand())
    {
        command.CommandText = File.ReadAllText("migration/Scripts/InitEventBus.sql");
        command.ExecuteNonQuery();
    }
}
```

## Schema Variables

The script uses PostgreSQL variable substitution for flexibility:

```sql
CREATE SCHEMA IF NOT EXISTS :"SCHEMA";
-- Default schema: "public"
-- Override with: -v SCHEMA=my_custom_schema
```

### Example: Multi-tenant Setup

For multi-tenant applications, create separate schemas:

```bash
# Tenant 1
psql -h localhost -U postgres -d EventBusDb \
  -v SCHEMA=tenant_001 \
  -f ./InitEventBus.sql

# Tenant 2
psql -h localhost -U postgres -d EventBusDb \
  -v SCHEMA=tenant_002 \
  -f ./InitEventBus.sql
```

## Verification

### Verify Schema Creation

```bash
psql -h localhost -U postgres -d EventBusDb -c "\dt"
```

Should output:

```
             List of relations
Schema |    Name    | Type  | Owner
--------+------------+-------+----------
public | published | table | postgres
public | received  | table | postgres
```

### Check Table Structure

```bash
psql -h localhost -U postgres -d EventBusDb -c "\d published"
psql -h localhost -U postgres -d EventBusDb -c "\d received"
```

### Verify with Docker

```bash
docker exec processity-backend-db-local psql -U postgres -d EventBusDb -c "\dt"
```

## Common Issues and Solutions

### Issue: Schema Not Created

**Symptom:** Tables not found after script execution

```
ERROR: relation "public.published" does not exist
```

**Solution:** Ensure the schema exists before running the script or include schema creation in the script execution.

### Issue: Connection Refused in Docker

**Symptom:** `docker exec` command fails with "Cannot connect to database"

```bash
# Wait for database to be ready
docker compose up -d core-db
sleep 10
docker exec -it processity-backend-db-local psql -U postgres -d EventBusDb -l
```

### Issue: Permission Denied

**Symptom:** Script fails with permission error

```
ERROR: permission denied to create schema public
```

**Solution:** Run as a superuser or grant schema creation privileges:

```bash
psql -h localhost -U postgres -c "GRANT CREATE ON DATABASE EventBusDb TO your_user;"
```

### Issue: Tables Already Exist

The script uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times. However, if you need to reset:

```bash
psql -h localhost -U postgres -d EventBusDb -c "DROP TABLE IF EXISTS published, received;"
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Initialize Event Bus

on: [push]

jobs:
  init-eventbus:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:latest
        env:
          POSTGRES_PASSWORD: ${{ secrets.DB_PASSWORD }}
          POSTGRES_USER: postgres
          POSTGRES_DB: EventBusDb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Initialize Event Bus Schema
        run: |
          psql postgresql://postgres:${{ secrets.DB_PASSWORD }}@localhost:5432/EventBusDb \
            -f Processity.SharedKernel/migration/Scripts/InitEventBus.sql
```

### Kubernetes Deployment Example

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: eventbus-init
spec:
  template:
    spec:
      containers:
        - name: postgres-client
          image: postgres:latest
          command: ["psql"]
          args:
            - "-h"
            - "postgres-service"
            - "-U"
            - "postgres"
            - "-d"
            - "EventBusDb"
            - "-f"
            - "/scripts/InitEventBus.sql"
          volumeMounts:
            - name: init-script
              mountPath: /scripts
      volumes:
        - name: init-script
          configMap:
            name: eventbus-init-script
      restartPolicy: Never
```

## Best Practices

1. **Run Script Once Per Database** - The script is idempotent (uses IF NOT EXISTS), but running multiple times is unnecessary.

2. **Separate Event Bus Database** - Always keep the event bus database separate from application databases for better isolation and scaling.

3. **Version Control** - Keep the script in version control and tag schema versions with migrations.

4. **Backup Before Migration** - Always backup production databases before running schema migrations:

   ```bash
   pg_dump -h host -U user -d EventBusDb -f backup.sql
   ```

5. **Test in Non-Prod First** - Test the script execution in development/staging before production.

6. **Monitor Schema Size** - The `published` and `received` tables can grow large. Implement retention policies:

   ```sql
   -- Clean up messages older than 30 days
   DELETE FROM published WHERE "Added" < NOW() - INTERVAL '30 days';
   DELETE FROM received WHERE "Added" < NOW() - INTERVAL '30 days';
   ```

7. **Index Management** - Consider adding indexes for performance:
   ```sql
   CREATE INDEX idx_published_status ON published("StatusName");
   CREATE INDEX idx_received_status ON received("StatusName");
   CREATE INDEX idx_published_added ON published("Added");
   CREATE INDEX idx_received_added ON received("Added");
   ```

## Related Documentation

- **CAP Framework**: https://cap.dotnetcore.xyz/
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Event Bus Architecture**: See `Processity.EventBus/docs/` directory
- **Module Integration**: See `Processity.EventBus/docs/AuthenticationContextFlow.md`

## Support

For issues or questions:

1. Check the `/docs` folders in individual services
2. Review CAP documentation and examples
3. Consult the Processity architecture documentation
