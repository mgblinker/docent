---
type: howto
---

# Docker Container Guide - InitEventBus Script

## Overview

This guide focuses specifically on executing the `InitEventBus.sql` script within Docker containerized PostgreSQL databases used in Processity development.

## Docker Environment Setup

### Current Local Environment

Based on the `EnvironmentSetup/Local/docker-compose.yml`:

```yaml
core-db:
  image: postgres
  container_name: processity-backend-db-local
  ports:
    - 5433:5432
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres123
  volumes:
    - processity-data-local:/var/lib/postgresql/data
```

**Key Information:**

- **Container Name:** `processity-backend-db-local`
- **Internal Port:** 5432
- **Host Port:** 5433
- **Username:** `postgres`
- **Password:** `postgres123`
- **Default Database:** `postgres`

---

## Docker Exec Methods

### Method 1: Input Redirection (Recommended)

This method pipes the SQL script directly into `psql` executed inside the container.

#### Command Syntax

```bash
docker exec -i CONTAINER_ID psql -U USERNAME -d DBNAME < /path/to/script.sql
```

#### Example for InitEventBus

```bash
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  < ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql
```

#### PowerShell Version (Windows)

```powershell
$script = Get-Content "./Processity.SharedKernel/migration/Scripts/InitEventBus.sql" -Raw
$script | docker exec -i processity-backend-db-local psql -U postgres -d EventBusDb
```

**Advantages:**

- ✅ Simplest syntax
- ✅ No need to mount files
- ✅ Works across operating systems

**Disadvantages:**

- Requires read access to script file on host machine

---

### Method 2: Mounted Volume Path

Mount the script directory into the container during execution.

#### Setup

Create a temporary mount when running the command:

```bash
docker exec -i processity-backend-db-local \
  -v "$PWD/Processity.SharedKernel/migration/Scripts:/scripts:ro" \
  psql -U postgres -d EventBusDb -f /scripts/InitEventBus.sql
```

**Note:** Some Docker versions don't support `-v` with `docker exec`. Use Method 1 or 3 instead.

---

### Method 3: Pre-mounted Volume (Recommended for Automation)

Configure volume mount in `docker-compose.yml` for persistent availability.

#### docker-compose.yml Configuration

```yaml
core-db:
  image: postgres
  container_name: processity-backend-db-local
  ports:
    - 5433:5432
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres123
  volumes:
    # Existing volumes
    - processity-data-local:/var/lib/postgresql/data

    # Add this line:
    - ./Processity.SharedKernel/migration/Scripts:/docker-entrypoint-initdb.d
```

#### Benefits:

- Scripts auto-execute on container startup
- Available for manual execution anytime
- Organized scripts in init directory
- Supports multiple scripts (execution order: alphabetical)

#### Execution (from host):

```bash
# Auto-runs on container start
docker compose up -d core-db

# Or manual execution
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -f /docker-entrypoint-initdb.d/InitEventBus.sql
```

#### Multiple Script Execution

If multiple scripts in `/docker-entrypoint-initdb.d/`:

```
scripts/
├── 01-InitEventBus.sql      # Runs first (alphabetically)
├── 02-CreateIndexes.sql     # Runs second
└── 03-DataSeed.sql          # Runs third
```

---

## Complete Workflow: Docker

### Setup Phase (One-time)

#### 1. Update docker-compose.yml

```yaml
core-db:
  image: postgres:15-alpine
  container_name: processity-backend-db-local
  restart: always
  ports:
    - 5433:5432
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres123
    POSTGRES_DB: postgres
  volumes:
    - ./Processity.SharedKernel/migration/Scripts:/docker-entrypoint-initdb.d:ro
    - processity-data-local:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 5s
    timeout: 5s
    retries: 5
```

#### 2. Create EventBusDb Database

```bash
# Start container
docker compose up -d core-db

# Wait for health check
docker compose ps core-db

# Create database
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -t -c "CREATE DATABASE \"EventBusDb\" ENCODING 'UTF8';"
```

#### 3. Initialize Event Bus Schema

```bash
# Method A: Auto-executed (already in /docker-entrypoint-initdb.d)
# Happens automatically on first container startup

# Method B: Manual execution
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -f /docker-entrypoint-initdb.d/InitEventBus.sql
```

#### 4. Verification

```bash
docker exec -it processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

Expected output:

```
    tablename
─────────────
 published
 received
```

---

### Usage: Running the Script

#### Scenario 1: First Time Setup

```bash
#!/bin/bash
# init-eventbus.sh

set -e

CONTAINER="processity-backend-db-local"
DB_USER="postgres"
DB_NAME="EventBusDb"
SCRIPT_PATH="./Processity.SharedKernel/migration/Scripts/InitEventBus.sql"

echo "🚀 Starting Event Bus Database Initialization..."

# 1. Start database container
echo "📦 Starting PostgreSQL container..."
docker compose up -d core-db

# 2. Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
until docker exec $CONTAINER pg_isready -U $DB_USER > /dev/null 2>&1; do
  sleep 1
done
echo "✅ Database is ready"

# 3. Create EventBusDb database if it doesn't exist
echo "📚 Creating EventBusDb database..."
docker exec -i $CONTAINER psql \
  -U $DB_USER \
  -t -c "CREATE DATABASE \"$DB_NAME\" ENCODING 'UTF8';" \
  2>/dev/null || echo "Database already exists"

# 4. Initialize event bus schema
echo "🔧 Initializing event bus schema..."
docker exec -i $CONTAINER psql \
  -U $DB_USER \
  -d $DB_NAME \
  < $SCRIPT_PATH

# 5. Verify
echo "🔍 Verifying schema..."
docker exec -i $CONTAINER psql \
  -U $DB_USER \
  -d $DB_NAME \
  -c "SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname = 'public';"

echo "✨ Event Bus initialization complete!"
```

Run it:

```bash
chmod +x init-eventbus.sh
./init-eventbus.sh
```

#### Scenario 2: Reset (Development/Testing)

```bash
#!/bin/bash
# reset-eventbus.sh

CONTAINER="processity-backend-db-local"
DB_USER="postgres"
DB_NAME="EventBusDb"

echo "⚠️  Resetting Event Bus Database..."

# Drop existing schema
docker exec -i $CONTAINER psql \
  -U $DB_USER \
  -d $DB_NAME \
  << EOF
DROP TABLE IF EXISTS published CASCADE;
DROP TABLE IF EXISTS received CASCADE;
EOF

echo "✅ Tables cleared"

# Reinitialize
docker exec -i $CONTAINER psql \
  -U $DB_USER \
  -d $DB_NAME \
  < ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql

echo "✨ Event Bus reset complete!"
```

#### Scenario 3: Custom Schema (Multi-tenant)

```bash
#!/bin/bash
# init-eventbus-multitenant.sh

CONTAINER="processity-backend-db-local"
DB_USER="postgres"
DB_NAME="EventBusDb"
SCRIPT_PATH="./Processity.SharedKernel/migration/Scripts/InitEventBus.sql"

TENANTS=("tenant_001" "tenant_002" "tenant_003")

for TENANT in "${TENANTS[@]}"; do
  echo "🔧 Initializing Event Bus for $TENANT..."

  # Create schema
  docker exec -i $CONTAINER psql \
    -U $DB_USER \
    -d $DB_NAME \
    -c "CREATE SCHEMA IF NOT EXISTS \"$TENANT\";"

  # Apply script with SCHEMA variable
  docker exec -i $CONTAINER psql \
    -U $DB_USER \
    -d $DB_NAME \
    -v SCHEMA="$TENANT" \
    < $SCRIPT_PATH

  echo "✅ $TENANT initialized"
done

echo "✨ Multi-tenant setup complete!"
```

---

## Docker Commands Reference

### Container Management

```bash
# Start container
docker compose up -d core-db

# Stop container
docker compose down

# View running containers
docker compose ps

# View logs
docker compose logs core-db

# Stop and remove (data persists in volumes)
docker compose down

# Stop and remove everything including volumes (resets DB)
docker compose down -v
```

### Database Access

```bash
# Interactive PostgreSQL shell in container
docker exec -it processity-backend-db-local psql -U postgres

# Execute single command
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -c "CREATE DATABASE EventBusDb;"

# Execute script from file
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  < ./script.sql
```

### Database Inspection

```bash
# List databases
docker exec -it processity-backend-db-local psql -U postgres -l

# List tables
docker exec -it processity-backend-db-local psql \
  -U postgres -d EventBusDb -dt

# Describe table
docker exec -it processity-backend-db-local psql \
  -U postgres -d EventBusDb -d+ published

# Row count
docker exec -it processity-backend-db-local psql \
  -U postgres -d EventBusDb \
  -c "SELECT COUNT(*) FROM published;"

# Schema size
docker exec -it processity-backend-db-local psql \
  -U postgres -d EventBusDb \
  -c "SELECT pg_size_pretty(pg_database_size('EventBusDb'));"
```

### Backup/Restore

```bash
# Backup entire database
docker exec -i processity-backend-db-local pg_dump \
  -U postgres \
  -d EventBusDb > eventbus_backup.sql

# Backup single table
docker exec -i processity-backend-db-local pg_dump \
  -U postgres \
  -d EventBusDb \
  -t published > published_backup.sql

# Restore from backup
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb < eventbus_backup.sql
```

---

## Docker Compose Integration

### Complete Service Definition

```yaml
version: "3.9"

services:
  core-db:
    image: postgres:15-alpine
    container_name: processity-backend-db-local
    restart: unless-stopped

    ports:
      - "5433:5432"

    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
      POSTGRES_INITDB_ARGS: "-E UTF8"

    volumes:
      # Mount initialization scripts
      - ./Processity.SharedKernel/migration/Scripts:/docker-entrypoint-initdb.d:ro
      # Mount data persistence
      - processity-data-local:/var/lib/postgresql/data
      # Mount logs (optional)
      - postgres-logs:/var/log/postgresql

    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d template1"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

    networks:
      - processity-network

    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  processity-data-local:
    driver: local
  postgres-logs:
    driver: local

networks:
  processity-network:
    driver: bridge
```

---

## Troubleshooting Docker

### Problem: Container Not Starting

```bash
# Check logs
docker compose logs core-db

# Check if port is in use
netstat -tuln | grep 5433   # Linux/Mac
netstat -ano | findstr 5433 # Windows

# Force recreate
docker compose up -d --force-recreate core-db
```

### Problem: Can't Execute psql in Container

```bash
# Check if container is running
docker compose ps

# Check if psql is installed
docker exec -it processity-backend-db-local which psql

# Try connecting
docker exec -it processity-backend-db-local psql -U postgres -d template1
```

### Problem: EventBusDb Database Doesn't Exist

```bash
# List all databases
docker exec -it processity-backend-db-local psql -U postgres -l

# Create it
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -c "CREATE DATABASE \"EventBusDb\";"
```

### Problem: Permission Denied on Script

```bash
# Check script file
ls -la ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql

# Ensure readable
chmod 644 ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql

# Verify in container
docker exec -it processity-backend-db-local ls -la /docker-entrypoint-initdb.d/
```

### Problem: Script Syntax Error

```bash
# Test script locally
psql -U postgres -f ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql

# Or via container with verbose output
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -E \  # Show commands
  < ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql
```

---

## Performance Monitoring

```bash
# Check connection count
docker exec -it processity-backend-db-local psql \
  -U postgres \
  -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Check query performance
docker exec -it processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -c "SELECT * FROM pg_stat_statements LIMIT 10;"

# Monitor table growth
docker exec -i processity-backend-db-local psql \
  -U postgres \
  -d EventBusDb \
  -c "SELECT 'published' as table_name, COUNT(*) as rows,
       pg_size_pretty(pg_total_relation_size('published')) as size
       FROM published
       UNION ALL
       SELECT 'received', COUNT(*),
       pg_size_pretty(pg_total_relation_size('received'))
       FROM received;"
```

---

## Best Practices for Docker Usage

1. **Always Use Named Containers** - Makes scripts reliable

   ```bash
   docker compose up -d core-db
   # Use: processity-backend-db-local
   ```

2. **Wait for Health Checks** - Before running scripts

   ```bash
   docker compose up -d core-db
   docker wait processity-backend-db-local:health
   ```

3. **Use Volume Mounts** - For script persistence

   ```yaml
   volumes:
     - ./migration/Scripts:/docker-entrypoint-initdb.d
   ```

4. **Separate Data from Schema** - Use distinct volumes

   ```yaml
   volumes:
     - ./scripts:/docker-entrypoint-initdb.d:ro # readonly
     - postgres-data:/var/lib/postgresql/data # persistent
   ```

5. **Test Before Production** - Run scripts in dev first

   ```bash
   docker compose -f docker-compose.dev.yml up
   # Test scripts here
   ```

6. **Keep Container Logs** - For debugging
   ```bash
   docker compose logs core-db > debug.log
   ```

---

## Environment-Specific Configurations

### Development (docker-compose.yml)

```yaml
core-db:
  image: postgres:15-alpine
  volumes:
    - ./Processity.SharedKernel/migration/Scripts:/docker-entrypoint-initdb.d
    - dev-postgres-data:/var/lib/postgresql/data
```

### Production (docker-compose.prod.yml)

```yaml
core-db:
  image: postgres:15-alpine
  restart: always
  volumes:
    - ./Processity.SharedKernel/migration/Scripts:/docker-entrypoint-initdb.d:ro
    - /data/postgres/prod:/var/lib/postgresql/data # Host path
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U postgres"]
    interval: 10s
    timeout: 5s
    retries: 5
  environment:
    POSTGRES_PASSWORD_FILE: /run/secrets/db_password
```

---

## Related Documentation

- **Full Guide:** See `INITEVENTBUS_GUIDE.md`
- **Quick Reference:** See `INITEVENTBUS_QUICK_REFERENCE.md`
- **Docker Docs:** https://docs.docker.com/reference/
- **PostgreSQL in Docker:** https://hub.docker.com/_/postgres
