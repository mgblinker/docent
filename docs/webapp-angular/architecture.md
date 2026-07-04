---
type: architecture
---

# Architecture — Processity.WebApp.Angular

## Component Hierarchy

```
AppComponent
├── LayoutComponent (shell: sidebar, header, content area)
│   ├── Feature Modules (lazy-loaded)
│   │   ├── ActivitiesModule
│   │   ├── SocialCareModule
│   │   ├── StaffManagementModule
│   │   ├── SalesModule
│   │   ├── CommunicationsModule
│   │   └── ...
│   └── SharedModule (common components)
└── Portal Entry Points (standalone sub-apps)
    ├── InstructorAppComponent
    ├── RelativesAppComponent
    └── SocialCareParentsAppComponent
```

## Solid Principles & file size
- Do not pack components with too much responsibility; use sub-components instead, and implement services and utilities

## Routing Structure

- Main app routes are lazy-loaded feature modules
- Each feature module defines its own child routes
- Sub-apps (portals) have independent routing configurations under `src/portals/`
- Guards handle authentication and role-based access

## State Management

- Component-level state for simple cases
- Services with BehaviorSubjects for shared state within feature modules
- No global store library — state is scoped per feature

## Shared Module Exports

Located in `src/shared/`:
- **Components** — Reusable UI components (data tables, forms, dialogs)
- **Pipes** — Common transformation pipes
- **Directives** — Shared directives (permissions, formatting)
- **Services** — Cross-cutting services (auth, notifications, error handling)
- **Models** — Shared TypeScript interfaces and types

## Testing

- **Unit tests** — Karma/Jasmine, co-located with components (`*.spec.ts`)
- **E2E tests** — Cucumber + Playwright in `e2e/` directory
- Feature files define scenarios; step definitions use Playwright page objects
