---
type: architecture
audience: public
---

# Licensing Service Architecture

## Overview

A microservice for managing tenant licenses and user license assignments
across the Processity platform.

## Features

- **Tenant License Management** — create and manage licenses for tenants with different tiers (Basic, Professional, Enterprise)
- **User License Assignments** — assign and revoke licenses to/from users
- **Feature-based Licensing** — enable specific features per license tier (e.g. [Drive's flat "drive" feature](../fileservice/architecture.md#licensing))
- **Event-Driven** — publishes license-change events other services (e.g. FileService) subscribe to
- **Multi-Tenancy** — Finbuckle.MultiTenant, same as every other Processity service

## Architecture

- **Domain Layer** — entities, value objects, domain logic
- **Application Layer** — CQRS commands/queries and handlers
- **Infrastructure Layer** — database context, repositories, external services
- **API Layer** — REST API controllers

## Related components

- [FileService Architecture](../fileservice/architecture.md#licensing) — `"drive"` is a single flat feature gating the standalone Drive apps
- [Drive Frontend Implementation Notes](../drive/internals.md#licensing-gap-known-tracked)
- [Tenant Provisioning Architecture](../tenantprovisioning/architecture.md)
