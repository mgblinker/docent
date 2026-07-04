---
type: howto
---

# InitEventBus Script Documentation

Complete documentation for the `InitEventBus.sql` script used to initialize PostgreSQL event bus databases in Processity microservices.

## 📚 Documentation Files

### 1. **INITEVENTBUS_GUIDE.md** - Full Comprehensive Guide

Complete reference documentation covering:

- What the script does
- Table structure and columns
- Using the script in each Processity module
- 5 different execution methods
- Multi-tenant setup
- CI/CD integration examples
- Best practices and tips
- Troubleshooting guide

**Start here for:** Deep understanding of the script and advanced scenarios

---

### 2. **INITEVENTBUS_QUICK_REFERENCE.md** - Quick Lookup Guide

Fast reference for:

- TL;DR command examples
- Common use cases and commands
- Docker container information
- Troubleshooting checklist
- Performance tuning tips
- Related file locations

**Start here for:** Quick command lookups and immediate execution

---

### 3. **DOCKER_EVENTBUS_GUIDE.md** - Docker Container Specialization

Docker-focused guide with:

- Docker environment setup
- 3 different docker exec methods
- Complete workflows with scripts
- Container management commands
- Backup/restore procedures
- docker-compose.yml configuration
- Environment-specific setups

**Start here for:** All docker container usage patterns

---

## 🚀 Quick Start

### For Immediate Setup

```bash
# Local development
psql -h localhost -U postgres -d EventBusDb \
  -f ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql

# Docker environment
docker exec -i processity-backend-db-local psql \
  -U postgres -d EventBusDb \
  < ./Processity.SharedKernel/migration/Scripts/InitEventBus.sql
```

### For learning more

1. Quick lookup → **INITEVENTBUS_QUICK_REFERENCE.md**
2. Docker questions → **DOCKER_EVENTBUS_GUIDE.md**
3. Full details → **INITEVENTBUS_GUIDE.md**

---

## 📍 Script Location

```
Processity.SharedKernel/
├── migration/
│   ├── Scripts/
│   │   └── InitEventBus.sql          ← The script itself
│   ├── Migrations/
│   │   └── [EF Core migrations]
│   ├── INITEVENTBUS_GUIDE.md         ← Full documentation
│   ├── INITEVENTBUS_QUICK_REFERENCE.md ← Quick reference
│   ├── DOCKER_EVENTBUS_GUIDE.md      ← Docker guide
│   └── README.md                      ← This file
```

---

## 💡 Navigation by Use Case

### "I need to set up event bus locally now"

1. Read: **INITEVENTBUS_QUICK_REFERENCE.md → TL;DR**
2. Run: Copy and execute the Local Development command
3. Verify: Run the verification command

### "I'm using Docker and need the event bus running"

1. Read: **DOCKER_EVENTBUS_GUIDE.md → Docker Setup Phase**
2. Update: Your `docker-compose.yml`
3. Run: The provided setup scripts
4. Verify: Using the provided verification commands

### "I need to understand what this script does"

1. Read: **INITEVENTBUS_GUIDE.md → Overview**
2. Review: Table structure section
3. See: Module-specific setup instructions

### "I'm debugging a problem with the event bus"

1. Check: **INITEVENTBUS_QUICK_REFERENCE.md → Troubleshooting Checklist**
2. Review: **INITEVENTBUS_GUIDE.md → Common Issues**
3. See: **DOCKER_EVENTBUS_GUIDE.md → Troubleshooting Docker** (if using Docker)

### "I'm integrating event bus into my module"

1. Understand: **INITEVENTBUS_GUIDE.md → Using in Each Module**
2. Configure: Connection strings in `appsettings.json`
3. Initialize: Using the appropriate method for your environment
4. See: Related module docs in `Processity.EventBus/docs/`

### "I need to automate this in CI/CD"

1. Read: **INITEVENTBUS_GUIDE.md → Integration with CI/CD**
2. See: **DOCKER_EVENTBUS_GUIDE.md → Workflow Scripts**
3. Adapt: One of the provided examples

---

## 📋 What the Script Does

Creates two PostgreSQL tables for the CAP event bus:

| Table         | Purpose                             | Key Use                            |
| ------------- | ----------------------------------- | ---------------------------------- |
| **published** | Outgoing events to other services   | Event publishing and retry logic   |
| **received**  | Incoming events from other services | Event subscription and idempotency |

**Supports:** Multi-tenant setups, custom schemas, automatic initialization

---

## 🔧 Supported Environments

### Local Development

- Direct PostgreSQL installation
- Connection via localhost
- Bash/PowerShell scripts

### Docker Development

- Docker Desktop or Docker Engine
- docker-compose orchestration
- Mounted script directories
- Single or multi-container setups

### CI/CD Pipelines

- GitHub Actions
- GitLab CI
- Jenkins
- Kubernetes

### Production Ready

- Volume-based persistence
- Health checks and monitoring
- Backup/restore procedures
- Performance optimization

---

## 📝 File Matrix

| Need               | File            | Section                   |
| ------------------ | --------------- | ------------------------- |
| Quick command      | QUICK_REFERENCE | TL;DR                     |
| Docker exec syntax | DOCKER_GUIDE    | Docker Exec Methods       |
| Connection string  | GUIDE           | Database Setup Per Module |
| Troubleshooting    | QUICK_REFERENCE | Checklist                 |
| Multi-tenant       | GUIDE           | Multi-tenant Setup        |
| CI/CD examples     | GUIDE           | Integration with CI/CD    |
| Performance        | QUICK_REFERENCE | Performance Tuning        |
| Backup/restore     | DOCKER_GUIDE    | Backup/Restore            |

---

## 🎯 Common Commands Cheat Sheet

### Basic Execution

```bash
# Local PostgreSQL
psql -U postgres -d EventBusDb -f InitEventBus.sql

# Docker container
docker exec -i CONTAINER psql -U postgres -d EventBusDb < InitEventBus.sql
```

### Verification

```bash
# List tables
psql -U postgres -d EventBusDb -c "\dt"

# Count rows
psql -U postgres -d EventBusDb -c "SELECT COUNT(*) FROM published;"
```

### Multi-tenant

```bash
# Create schema
psql -U postgres -d EventBusDb -c "CREATE SCHEMA myschema;"

# Initialize for schema
psql -U postgres -d EventBusDb -v SCHEMA=myschema -f InitEventBus.sql
```

### Docker

```bash
# Check status
docker compose ps

# Manual execution
docker exec -i processity-backend-db-local psql \
  -U postgres -d EventBusDb < InitEventBus.sql

# Backup
docker exec -i processity-backend-db-local pg_dump \
  -U postgres -d EventBusDb > backup.sql
```

---

## 🔍 Documentation Highlights

### Unique Features by Document

**INITEVENTBUS_GUIDE.md:**

- ✅ Architecture explanation
- ✅ Module integration details
- ✅ Configuration patterns
- ✅ Best practices (7 items)
- ✅ CI/CD examples (GitHub & K8s)

**INITEVENTBUS_QUICK_REFERENCE.md:**

- ✅ Fastest lookup format
- ✅ Troubleshooting decision tree
- ✅ All commands in one place
- ✅ Exit code reference
- ✅ Performance commands

**DOCKER_EVENTBUS_GUIDE.md:**

- ✅ Docker environment details
- ✅ 3+ docker exec patterns
- ✅ Complete workflow scripts
- ✅ Container management commands
- ✅ Docker-specific troubleshooting
- ✅ docker-compose examples
- ✅ Environment-specific configs

---

## 🔗 Related Resources

### Within Processity

- `Processity.EventBus/` - Main event bus implementation
- `Processity.EventBus/docs/` - Architecture docs
- `Processity.SharedKernel/` - Shared kernel with event handler implementations
- Individual module docs for specific integration patterns

### External Documentation

- **CAP Framework:** https://cap.dotnetcore.xyz/
- **PostgreSQL:** https://www.postgresql.org/docs/
- **Docker:** https://docs.docker.com/
- **Docker Compose:** https://docs.docker.com/compose/

---

## ✅ Pre-execution Checklist

Before running the script:

- [ ] PostgreSQL server is installed (local) or container is running (Docker)
- [ ] Database user credentials are available
- [ ] Target database exists or will be auto-created
- [ ] Sufficient disk space for tables
- [ ] Network connectivity to database server
- [ ] Script file exists at expected location
- [ ] Proper file permissions on script

---

## 📞 Support & Help

### If You're Stuck

1. Check the appropriate documentation file above
2. Look for your scenario in the use case matrix
3. Review the troubleshooting sections
4. Check related module documentation
5. Consult CAP framework docs

### Common Questions

- **"How do I run this in Docker?"** → See **DOCKER_EVENTBUS_GUIDE.md**
- **"What's the fastest way?"** → See **QUICK_REFERENCE.md → TL;DR**
- **"I'm getting an error"** → See **QUICK_REFERENCE.md → Troubleshooting**
- **"I need to understand the architecture"** → See **GUIDE.md → Overview**
- **"How do I set up multiple tenants?"** → See **GUIDE.md → Multi-tenant**

---

## 🎓 Learning Path

### Beginner (First Time)

1. Read: QUICK_REFERENCE.md (introduction + your environment type)
2. Execute: One of the example commands
3. Verify: Using the verification commands
4. Read: GUIDE.md (relevant section only)

### Intermediate (Integration & Configuration)

1. Read: GUIDE.md (modules and configuration section)
2. Configure: Connection strings and environment variables
3. Execute: Setup for your specific module
4. Review: Related module documentation

### Advanced (Docker, CI/CD, Production)

1. Read: DOCKER_GUIDE.md (if using containers)
2. Read: GUIDE.md → CI/CD Integration section
3. Implement: Automated setup scripts
4. Monitor: Performance and table growth

---

## 📊 Document Quick Stats

| Document                 | Lines     | Sections | Commands | Examples |
| ------------------------ | --------- | -------- | -------- | -------- |
| INITEVENTBUS_GUIDE.md    | ~600      | 12       | 40+      | 15+      |
| QUICK_REFERENCE.md       | ~400      | 8        | 30+      | 10+      |
| DOCKER_EVENTBUS_GUIDE.md | ~700      | 15       | 50+      | 20+      |
| **Total**                | **~1700** | **35**   | **120+** | **45+**  |

---

## 🔄 Version & Updates

- **Created:** February 2026
- **For:** Processity Architecture
- **Applies to:** CAP Framework integration
- **Database:** PostgreSQL 12+
- **Supported Platforms:** Linux, macOS, Windows (WSL/native)

---

## 📝 Document Organization

```
This README (You are here)
│
├── INITEVENTBUS_GUIDE.md
│   ├── Overview & Architecture
│   ├── Module-specific guidance
│   ├── 5 Execution methods
│   ├── Advanced topics
│   └── Troubleshooting
│
├── INITEVENTBUS_QUICK_REFERENCE.md
│   ├── TL;DR quick start
│   ├── Command cheat sheets
│   ├── Use case matrix
│   ├── Docker container info
│   └── Troubleshooting checklist
│
└── DOCKER_EVENTBUS_GUIDE.md
    ├── Docker setup
    ├── 3 exec methods
    ├── Complete workflows
    ├── Management commands
    ├── Backup/restore
    └── Environment configs
```

---

## 🎯 Start Here

**First time?** → Jump to **INITEVENTBUS_QUICK_REFERENCE.md** and find your environment type

**Using Docker?** → Jump to **DOCKER_EVENTBUS_GUIDE.md → Docker Exec Methods**

**Going deep?** → Start with **INITEVENTBUS_GUIDE.md → Overview**

**Need help fast?** → Check **QUICK_REFERENCE.md → Troubleshooting Checklist**

---

**Last updated:** February 2026  
**Status:** Complete and Ready to Use
