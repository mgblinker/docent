---
type: architecture
---

# Backend Data Model Relationships

This document describes the high-level data model relationships in the `Processity.Backend` project and provides Mermaid diagrams to visualize the core entity relationships (ERD) and module dependencies (tight and loose).

**Scope & approach**

- This is a conceptual, cross-module overview intended to help engineers understand how data flows between primary domains (CoreData, SocialCare, CareManagement, StaffManagement, CourseManagement, ProductData, Communications, EventManagement, Authorization, RuleEngine, etc.).
- The ERD shows core entities and key foreign-key relationships used across the backend modules.
- The dependency graph uses solid arrows for _tight_ (strong, frequently accessed/owned) dependencies and dashed arrows for _loose_ (integration / optional / eventual consistency) dependencies.

---

## Canonical core entities (summary)

- **Tenant**: multi-tenant boundary; many entities have a `tenant_id`.
- **User**: authentication/account record mapped to staff or external users.
- **Person**: domain person (service user / citizen / client) and demographic data.
- **Organization**: provider organisations, teams, employers.
- **Staff**: employees, workers, with links to `User` and `Organization`.
- **Case**: social care case record that references `Person` and assigned `Staff`.
- **Assessment**: assessment records tied to a `Case` or `Person`.
- **Appointment**: scheduled meeting tied to `Case`, `Person`, `Staff`.
- **CarePlan**: a plan attached to a `Case` and composed of `Tasks`.
- **Task**: actionable items, often assigned to `Staff` or `Teams`.
- **Course**: training or course objects with `Enrollment` records.
- **Product/Order**: product catalog and order/transaction records (Sales/ProductData).
- **File**: stored file metadata managed by FileService.
- **Message/Communication**: communication records (emails, SMS, in-app messages).

These canonical entities are referenced across multiple modules in the solution. Below we present a compact ERD and then a module dependency diagram.

---

## ERD

The ERD below is a simplified, visual representation using colored boxes to show which module each entity belongs to. Each node lists the primary key and the key foreign key attributes used for cross-module relationships.

```mermaid
graph LR
  %% --- Nodes (entity: multiline labels)
  TENANT["TENANT\n(id PK)\nname"]
  USER["USER\n(id PK)\ntenant_id FK\nusername\nemail"]
  PERSON["PERSON\n(id PK)\ntenant_id FK\nfirst_name\nlast_name\nDOB"]
  ORGANIZATION["ORGANIZATION\n(id PK)\ntenant_id FK\nname"]
  STAFF["STAFF\n(id PK)\nuser_id FK\norganization_id FK\ntenant_id FK\nrole_id"]
  CASE["CASE\n(id PK)\nperson_id FK\ntenant_id FK\nstatus"]
  ASSESSMENT["ASSESSMENT\n(id PK)\ncase_id FK\nassessor_staff_id FK\ncreated_at"]
  APPOINTMENT["APPOINTMENT\n(id PK)\ncase_id FK\nperson_id FK\nstaff_id FK\nstart/end"]
  CAREPLAN["CAREPLAN\n(id PK)\ncase_id FK\ncreated_by_staff_id FK"]
  TASK["TASK\n(id PK)\ncareplan_id FK\nassigned_staff_id FK\nstatus"]
  COURSE["COURSE\n(id PK)\ntenant_id FK\ntitle"]
  ENROLLMENT["ENROLLMENT\n(id PK)\ncourse_id FK\nuser_id FK"]
  PRODUCT["PRODUCT\n(id PK)\ntenant_id FK\nsku"]
  ORDER["ORDER\n(id PK)\nproduct_id FK\nperson_id FK"]
  FILE["FILE\n(id PK)\ntenant_id FK\nowner_id FK\nowner_type"]
  MESSAGE["MESSAGE\n(id PK)\nfrom_user_id FK\nto_user_id FK\nrelated_case_id FK"]

  %% --- Styling: assign classes for modules
  classDef core fill:#e8f4ff,stroke:#1f78b4,color:#0b3d5a
  classDef staff fill:#e9f7ef,stroke:#2ca02c,color:#0b4d20
  classDef social fill:#fff4e6,stroke:#ff8c00,color:#5a3a00
  classDef course fill:#f7f0ff,stroke:#9b59b6,color:#3a1f4d
  classDef product fill:#fff0f0,stroke:#d62728,color:#5a1515
  class TENANT,USER,PERSON,ORGANIZATION core
  class STAFF staff
  class CASE,ASSESSMENT,APPOINTMENT,CAREPLAN,TASK social
  class COURSE,ENROLLMENT course
  class PRODUCT,ORDER product
  class FILE,MESSAGE core

  %% --- Relationships (annotated with FK attribute)
  USER -->|tenant_id| TENANT
  PERSON -->|tenant_id| TENANT
  ORGANIZATION -->|tenant_id| TENANT
  STAFF -->|user_id| USER
  STAFF -->|organization_id| ORGANIZATION
  CASE -->|person_id| PERSON
  ASSESSMENT -->|case_id| CASE
  APPOINTMENT -->|case_id / person_id / staff_id| CASE
  CAREPLAN -->|case_id| CASE
  TASK -->|careplan_id| CAREPLAN
  TASK -->|assigned_staff_id| STAFF
  ENROLLMENT -->|course_id| COURSE
  ENROLLMENT -->|user_id| USER
  ORDER -->|product_id| PRODUCT
  ORDER -->|person_id| PERSON
  FILE -->|tenant_id / owner_id| TENANT
  FILE -->|owner_id| USER
  MESSAGE -->|from_user_id / to_user_id| USER

  %% Cross-link: staff assigned to cases (assignment table implied)
  STAFF -->|"assigned_cases (join)"| CASE

  %% Note: this layout intentionally trades ER-specific syntax for clearer, module-colored visualization.
```

---

**Legend (module colors used in ERD)**

```mermaid
graph LR
  %% Legend for module colors used in the ERD above
  LCore["CoreData"]:::core
  LStaff["StaffManagement"]:::staff
  LSocial["SocialCare"]:::social
  LCourse["CourseManagement"]:::course
  LProduct["ProductData"]:::product

  classDef core fill:#e8f4ff,stroke:#1f78b4,color:#0b3d5a;
  classDef staff fill:#e9f7ef,stroke:#2ca02c,color:#0b4d20;
  classDef social fill:#fff4e6,stroke:#ff8c00,color:#5a3a00;
  classDef course fill:#f7f0ff,stroke:#9b59b6,color:#3a1f4d;
  classDef product fill:#fff0f0,stroke:#d62728,color:#5a1515;

  %% Keep nodes separated for clarity
  LCore --- LStaff
  LStaff --- LSocial
  LSocial --- LCourse
  LCourse --- LProduct
```

**Legend (project types in dependency graph)**

```mermaid
graph LR
  MModel["Model Project"]:::modelProject
  MService["Service Project"]:::serviceProject

  classDef modelProject stroke:#1f78b4,stroke-width:3px,fill:#fff,color:#000;
  classDef serviceProject stroke:#2ca02c,stroke-width:3px,fill:#fff,color:#000;

  MModel --- MService
```

## Module Dependency Graph

The diagram below replaces the previous "Tight"/"Loose" labels with solid (tight/ownership) and dashed (loose/integration) edges. Each edge is annotated with the specific attributes or data flows that cause the dependency.

```mermaid
graph TB
  %% Vertical layout (Top -> Bottom) with module-colored nodes
  CoreData["CoreData\n(tenants, users, persons)"]
  Authorization["Authorization\n(roles, permissions)"]
  Staff["StaffManagement\n(staff, teams)"]
  SocialCare["SocialCare\n(cases, assessments)"]
  CareMgmt["CareManagement\n(careplans, tasks)"]
  Course["CourseManagement\n(courses, enrollments)"]
  Product["ProductData\n(products)"]
  Sales["Sales\n(orders, invoices)"]
  Comm["Communications\n(messages, notifications)"]
  Event["EventManagement\n(events, calendar)"]
  Rule["RuleEngine\n(business rules)"]
  FileSvc["FileService\n(files, blobs)"]

  %% Reuse the same class color definitions as the ERD so legend matches
  classDef core fill:#e8f4ff,stroke:#1f78b4,color:#0b3d5a;
  classDef staff fill:#e9f7ef,stroke:#2ca02c,color:#0b4d20;
  classDef social fill:#fff4e6,stroke:#ff8c00,color:#5a3a00;
  classDef course fill:#f7f0ff,stroke:#9b59b6,color:#3a1f4d;
  classDef product fill:#fff0f0,stroke:#d62728,color:#5a1515;

  class CoreData,Authorization,FileSvc core
  class Staff staff
  class SocialCare,CareMgmt social
  class Course course
  class Product,Sales product
  class Comm core
  class Event core
  class Rule core

  %% --- Project type classes: model vs service (visual distinction)
  classDef modelProject stroke:#1f78b4,stroke-width:3px;
  classDef serviceProject stroke:#2ca02c,stroke-width:3px;

  %% Assign project-type classes (model projects own canonical entities)
  class CoreData,Product,Course modelProject
  %% Service projects (application/services that depend on models)
  class Authorization,Staff,SocialCare,CareMgmt,Sales,Comm,Event,Rule,FileSvc serviceProject

  %% --- Solid edges = ownership / strong coupling
  CoreData -->|"tenant_id, user_id, canonical identities"| Authorization
  CoreData -->|"user/person canonical ids, tenant_id"| Staff
  CoreData -->|"person_id, tenant_id, user_id"| SocialCare
  SocialCare -->|"case_id, person_id (case ownership)"| CareMgmt
  Staff -->|"staff_id, team_id (assignments)"| CareMgmt
  Product -->|"product_id, sku"| Sales

  %% --- Dashed edges = loose/integration (events, optional refs)
  SocialCare -.->|"case_id, person contact info (notifications)"| Comm
  CareMgmt -.->|"task assignments, notifications"| Comm
  Course -.->|"enrollments -> user_id, tenant_id"| CoreData
  Sales -.->|"customer/person refs, tenant_id"| CoreData
  Rule -.->|"case attributes, assessment data"| SocialCare
  Rule -.->|"careplan and task data"| CareMgmt
  FileSvc -.->|"file_id, owner_ref (entity id)"| SocialCare
  FileSvc -.->|"file_id, owner_ref (staff profile)"| Staff
  Event -.->|"calendar events, case_id"| SocialCare
  Event -.->|"staff calendar, availability"| Staff

  %% --- Cross-cutting event-driven integrations
  SocialCare -.->|"events (case created/updated)"| Event
  CareMgmt -.->|"events (task created/updated)"| Event
  Sales -.->|"events -> notifications"| Comm

```

### How to read the dependency graph

- Core modules like `CoreData`, `Authorization`, `StaffManagement`, and `SocialCare` are tightly coupled because they own canonical records (users, tenants, persons, staff) and are referenced by many downstream modules.
- Service integrations, notifications, file storage and rule evaluation are intentionally looser — they often rely on events or reference IDs rather than owning the canonical data.

---

## Practical notes & recommendations

- Treat `CoreData` entities as canonical — avoid duplicating core identity data across subsystems.
- Use event-driven patterns (EventBus) for loose integrations to keep strong ownership boundaries clear and reduce synchronous coupling.
- Where a module must reference another module's data (e.g., `CareManagement` referencing `Staff`), prefer FK references to `CoreData` IDs for integrity, and use denormalized snapshots for read performance when needed.
- Document any module-specific extensions to the canonical entities inside that module's folder (e.g., `SocialCare/src` should document `Case` schema additions).

---

If you'd like, I can:

- generate a more detailed ERD for a specific module (e.g., `SocialCare`),
- extract actual DB schema definitions from the repository and produce a physical ERD, or
- add cross-reference tables and sample queries showing how modules join on canonical entities.

Tell me which next step you'd prefer.
