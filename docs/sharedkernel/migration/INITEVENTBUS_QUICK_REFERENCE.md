---
type: howto
---

# InitEventBus Quick Reference

## TL;DR

### Local Development (Direct PostgreSQL)

```bash
# Create database first (if needed)
psql -U postgres -c "CREATE DATABASE EventBusDb;"

# Run the script
psql -h localhost -U postgres -d EventBusDb \
  -f ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql
```

### Docker Compose Environment

```bash
# Option 1: Auto-run on container startup (recommended)
# Mount script directory in docker-compose.yml:
volumes:
  - ./Processity.SharedKernel/migration/Scripts:/docker-entrypoint-initdb.d

# Then start: docker compose up

# Option 2: Manual docker exec
docker exec -it processity-backend-db-local psql \
  -U postgres -d EventBusDb \
  -f /docker-entrypoint-initdb.d/InitEventBus.sql

# Option 3: From host machine
docker exec -i processity-backend-db-local psql \
  -U postgres -d EventBusDb \
  < ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql
```

### Verify Success

```bash
# Direct connection
psql -h localhost -U postgres -d EventBusDb -c "\dt"

# Docker
docker exec -it processity-backend-db-local psql \
  -U postgres -d EventBusDb -c "\dt"
```

Expected output shows `published` and `received` tables.

---

## Script Purpose

Creates two tables in PostgreSQL for the CAP (Cloud-Native Application Programming) event bus:

- **published** - Outgoing events
- **received** - Incoming events

## Required Parameters

| Parameter | Default      | Purpose                                  |
| --------- | ------------ | ---------------------------------------- |
| SCHEMA    | "public"     | Database schema where tables are created |
| Host      | localhost    | Database server address                  |
| Database  | EventBusDb   | Database name                            |
| User      | postgres     | Database user                            |
| Password  | _(required)_ | Database password                        |

## Schema Variables (Optional)

Override default schema:

```bash
psql -U postgres -d EventBusDb -v SCHEMA=my_schema -f InitEventBus.sql
```

## Docker Exec Patterns

### Pattern 1: Pass script via redirect (preferred)

```bash
docker exec -i CONTAINER_NAME psql -U USER -d DBNAME < /path/to/script.sql
```

### Pattern 2: Reference mounted path

```bash
docker exec -it CONTAINER_NAME psql -U USER -d DBNAME -f /mounted/path/script.sql
```

### Pattern 3: List and check status

```bash
# List databases
docker exec -it CONTAINER_NAME psql -U postgres -l

# Check tables in specific db
docker exec -it CONTAINER_NAME psql -U postgres -d EventBusDb -dt

# Detailed table info
docker exec -it CONTAINER_NAME psql -U postgres -d EventBusDb -d+ published
```

---

## Common Commands by Use Case

### Use Case: First-Time Setup (Local)

```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE EventBusDb;"

# 2. Initialize schema
psql -U postgres -d EventBusDb \
  -f ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql

# 3. Verify
psql -U postgres -d EventBusDb -c "SELECT * FROM published LIMIT 1;"
```

### Use Case: Docker Development Setup

```bash
# 1. Ensure container is running
docker compose up -d core-db

# 2. Wait briefly
sleep 3

# 3. Initialize
docker exec -i processity-backend-db-local psql \
  -U postgres -d EventBusDb \
  < ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql

# 4. Verify
docker exec -it processity-backend-db-local psql \
  -U postgres -d EventBusDb -c "\dt"
```

### Use Case: Multi-Tenant Schema

```bash
# Create schema per tenant
for TENANT in tenant_001 tenant_002 tenant_003; do
  psql -U postgres -d EventBusDb -v SCHEMA=$TENANT \
    -f ./InitEventBus.sql
done

# Verify all schemas
psql -U postgres -d EventBusDb -c "\dn"
```

### Use Case: Automated Reset

```bash
# Drop and recreate (careful in production!)
psql -U postgres -d EventBusDb << EOF
DROP TABLE IF EXISTS published, received;
EOF

# Reinitialize
psql -U postgres -d EventBusDb \
  -f ./InitEventBus.sql
```

### Use Case: Backup Before Migration

```bash
# Backup entire database
pg_dump -h localhost -U postgres -d EventBusDb \
  > eventbus_backup_$(date +%Y%m%d).sql

# Backup single table
pg_dump -h localhost -U postgres -d EventBusDb -t published \
  > published_backup.sql
```

---

## Troubleshooting Checklist

| Issue                         | Command to Check                               | Solution                           |
| ----------------------------- | ---------------------------------------------- | ---------------------------------- |
| Database doesn't exist        | `psql -U postgres -l`                          | `CREATE DATABASE EventBusDb;`      |
| Can't connect                 | `psql -h localhost -U postgres -d template1`   | Check host, port, credentials      |
| Tables exist but inaccessible | `psql -d EventBusDb -c "\dt public.*"`         | Check schema and permissions       |
| Docker container not ready    | `docker compose ps`                            | Wait for "healthy" status          |
| Script syntax error           | `psql -U postgres -d EventBusDb -f script.sql` | Check script file encoding (UTF-8) |
| Permission denied             | `psql -U postgres -d EventBusDb -c "\du"`      | Grant privileges to user           |

---

## Docker Container References

### Backend Event Bus Database

```
Container Name: processity-backend-db-local
Port: 5433
Environment:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres123
Default Database: postgres
```

### Connection String (from compose file)

```
Host=processity-backend-db-local;Database=EventBusDb;User ID=postgres;Password=postgres123;
```

---

## Related Files

| File                        | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `InitEventBus.sql`          | The initialization script (creates tables)  |
| `INITEVENTBUS_GUIDE.md`     | Full documentation (this guide's companion) |
| `Processity.EventBus/docs/` | Architecture and integration docs           |
| `appsettings.json`          | Connection string configuration             |
| `docker-compose.yml`        | Container orchestration configuration       |

---

## File Locations

```
Processity.SharedKernel/
├── migration/
│   ├── Scripts/
│   │   └── InitEventBus.sql
│   ├── Migrations/
│   │   └── [EF Core migrations]
│   └── INITEVENTBUS_GUIDE.md

Processity.EventBus/
├── migration/
│   ├── EventBus.Migrations.csproj
│   └── Migrations/
```

---

## Exit Codes Reference

| Code | Meaning                |
| ---- | ---------------------- |
| 0    | Success                |
| 1    | General error          |
| 2    | Connection error       |
| 3    | Syntax error in script |

---

## Key Table Information

### published table

- Rows: Outgoing events to external services
- Typical retention: 7-30 days
- Query example: `SELECT COUNT(*) FROM published WHERE "StatusName" = 'Scheduled';`

### received table

- Rows: Incoming events from external services
- Typical retention: 7-30 days
- Query example: `SELECT COUNT(*) FROM received WHERE "StatusName" = 'Succeeded';`

---

## Performance Tuning

### Add Indexes

```sql
CREATE INDEX idx_published_status ON published("StatusName");
CREATE INDEX idx_published_added ON published("Added");
CREATE INDEX idx_received_status ON received("StatusName");
CREATE INDEX idx_received_added ON received("Added");
```

### Check Table Size

```bash
docker exec -it processity-backend-db-local psql -U postgres -d EventBusDb \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Cleanup Old Records

```sql
-- Keep only last 30 days
DELETE FROM published WHERE "Added" < NOW() - INTERVAL '30 days';
DELETE FROM received WHERE "Added" < NOW() - INTERVAL '30 days';
```

---

## Environment Variables

Common environment variables for connection:

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
EVENTBUS_DB=EventBusDb
```

Set in shell:

```bash
export POSTGRES_PASSWORD=postgres123
psql -U $POSTGRES_USER -h $POSTGRES_HOST -d $EVENTBUS_DB \
  -f InitEventBus.sql
```

---

## Need Help?

1. Check the full guide: `INITEVENTBUS_GUIDE.md` (this directory)
2. Review CAP docs: https://cap.dotnetcore.xyz/
3. PostgreSQL docs: https://www.postgresql.org/docs/
4. Check module-specific docs in `Processity.EventBus/docs/`
