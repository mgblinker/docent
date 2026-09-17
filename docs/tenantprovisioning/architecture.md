---
type: architecture
audience: public
---

# Tenant Provisioning Architecture

## Overview

The Tenant Provisioning Service automates tenant onboarding for the
Processity platform: creating tenant records, database schemas, and
initial configuration across every module a tenant is entitled to.

## Components

1. **Provisioning Orchestrator** — coordinates the execution of provisioning steps
2. **Provisioning Steps** — individual step implementations (create tenant, create schema, apply migrations, etc.)
3. **Module Registry** — database-driven registry of which modules to provision
4. **API** — REST API for triggering and monitoring provisioning
5. **Admin UI** — Blazor WebAssembly interface for administration

## Features

- Optional manual approval before provisioning
- Database-driven module registry (modules configured via database, not config files)
- Automated schema creation, migrations, and data seeding
- Automatic rollback on failure
- Detailed per-step tracking

## Provisioning Flow

1. Create a provisioning request (via API or Admin UI)
2. Request enters `PendingApproval` status
3. Administrator approves/rejects via Admin UI
4. On approval, the orchestrator executes steps:
   - Create tenant record in the Authentication service
   - Generate secrets in KeyVault
   - For each module: create database schema → apply EF Core migrations → seed configuration data
   - Create initial admin user
5. Request marked `Completed` or `Failed`
6. Failed requests can be rolled back

## Related components

- [FileService Architecture](../fileservice/architecture.md) — `FileServiceProvisionableModule` is `IsRequired=true`, provisions for every tenant regardless of Drive license
- [Authentication Architecture](../authentication/architecture.md)
