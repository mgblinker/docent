---
type: feature
---

# Contact Functions

## Overview

Contact Functions represent roles, capabilities, or responsibilities assigned to contacts in the Processity system. This feature is part of COREAPPS-994 and serves as the trigger for automated permission and role assignment via the RuleEngine.

## Purpose

Functions allow the system to track:
- **What a person does**: Social worker, family companion, course participant, HR consultant, etc.
- **When they started/stopped**: Assignment and revocation timestamps
- **Multiple concurrent roles**: A person can have many active functions simultaneously

## Entity: ContactFunction

**File**: `CoreData/src/CoreData/Contacts/Domain/Entities/ContactFunction.cs`

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `Id` | ContactFunctionId | Unique identifier |
| `ContactId` | ContactId | The contact this function is assigned to |
| `FunctionCode` | string | Unique code (e.g., "FAMILY_COMPANION", "SOCIAL_WORKER") |
| `FunctionName` | string | Display name (e.g., "Family Companion", "Social Worker") |
| `AssignedAt` | DateTime | When the function was assigned |
| `AssignedBy` | UserId | Who assigned the function |
| `RevokedAt` | DateTime? | When the function was revoked (null if active) |
| `IsActive` | bool | Whether the assignment is currently active |

### Key Methods

```csharp
// Create a new active function assignment
ContactFunction.Create(contactId, functionCode, functionName, assignedBy)

// Revoke an existing function
contactFunction.Revoke()
```

## API Endpoints

**Controller**: `CoreData/src/CoreData/Contacts/Features/ContactFunctions/ContactFunctionsController.cs`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/core-data/v1.0/contacts/{contactId}/functions` | Assign function to contact |
| DELETE | `/api/core-data/v1.0/contacts/{contactId}/functions/{functionCode}` | Revoke function from contact |
| GET | `/api/core-data/v1.0/contacts/{contactId}/functions` | Get all functions for a contact |
| GET | `/api/core-data/v1.0/contacts/{contactId}/functions/active` | Get active functions only |

## Event Flow

### 1. Function Assignment

```
User/System assigns function to contact
    ↓
ContactFunction.Create() called
    ↓
ContactFunctionAssignedDomainEvent raised
    ↓
ContactFunctionAssignedDomainEventHandler processes event
    ↓
ContactFunctionAssignedEvent published to CAP/RabbitMQ
    ↓
RuleEngine receives event and evaluates rules
```

### 2. Function Revocation

```
User/System revokes function from contact
    ↓
ContactFunction.Revoke() called
    ↓
ContactFunctionRevokedDomainEvent raised
    ↓
ContactFunctionRevokedDomainEventHandler processes event
    ↓
ContactFunctionRevokedEvent published to CAP/RabbitMQ
    ↓
RuleEngine receives event and evaluates revocation rules
```

## Integration Events

### ContactFunctionAssignedEvent

**File**: `CoreData.Models/Contacts/Events/ContactFunctionAssignedEvent.cs`

**Event Name**: `contact.function.assigned`

**Payload (ContactFunctionEventData)**:
- `ContactId` (Guid)
- `UserId` (Guid?)
- `FunctionCode` (string)
- `FunctionName` (string)
- `ContactFirstName` (string)
- `ContactLastName` (string)
- `ActiveFunctionCodes` (IReadOnlyList<string>)

**Consumers**:
- RuleEngine (evaluates rules for function assignment)

### ContactFunctionRevokedEvent

**Event Name**: `contact.function.revoked`

**Payload**: Same as ContactFunctionAssignedEvent

**Consumers**:
- RuleEngine (evaluates rules for function revocation)

## Common Function Codes

These are example function codes (actual codes may vary per tenant):

| FunctionCode | FunctionName | Typical Use Case |
|--------------|--------------|------------------|
| `FAMILY_COMPANION` | Family Companion | Social care family support worker |
| `SOCIAL_WORKER` | Social Worker | Licensed social work professional |
| `COURSE_PARTICIPANT` | Course Participant | Person enrolled in training/education |
| `HR_CONSULTANT` | HR Consultant | Human resources staff member |
| `FINANCE_CONTROLLER` | Finance Controller | Finance department staff |
| `BACKOFFICE_STAFF` | Backoffice Staff | Administrative support personnel |
| `INSTRUCTOR` | Instructor | Training/course instructor |

## Integration with RuleEngine

When a function is assigned, the RuleEngine can automatically:

1. **Assign Security Roles**: Grant system permissions (via Authentication Service)
2. **Assign Module Roles**: Grant module-specific roles (e.g., PersonRole in SocialCare)

### Example Rule

**Scenario**: When a contact is assigned the "SOCIAL_WORKER" function, automatically:
- Assign "SocialWorkerRole" security role (grants access to social care features)
- Assign PersonRole.SocialWorker in the SocialCare module (allows case assignment)

**Rule Configuration** (see RuleEngine documentation for details):
- **Condition**: FunctionCode = "SOCIAL_WORKER"
- **Action 1**: AssignSecurityRole with RoleName = "SocialWorkerRole"
- **Action 2**: PublishModuleEvent with TargetModule = "SocialCare", AssignmentType = "PersonRole", AssignmentValue = "SocialWorker"

## Database Schema

**Table**: `ContactFunctions`

```sql
CREATE TABLE ContactFunctions (
    Id uniqueidentifier PRIMARY KEY,
    ContactId uniqueidentifier NOT NULL,
    FunctionCode nvarchar(100) NOT NULL,
    FunctionName nvarchar(200) NOT NULL,
    AssignedAt datetime2 NOT NULL,
    AssignedBy uniqueidentifier NOT NULL,
    RevokedAt datetime2 NULL,
    IsActive bit NOT NULL,
    CreatedAt datetime2 NOT NULL,
    ModifiedAt datetime2 NULL,
    CONSTRAINT FK_ContactFunctions_Contacts
        FOREIGN KEY (ContactId) REFERENCES Contacts(Id)
)
```

**Indexes**:
- Unique index on (ContactId, FunctionCode, IsActive) to prevent duplicate active assignments
- Index on FunctionCode for querying by function type

## Usage Example (C#)

```csharp
// Assign a function to a contact
var functionCode = "FAMILY_COMPANION";
var functionName = "Family Companion";
var assignedBy = UserId.From(currentUserId);

var function = ContactFunction.Create(
    contactId,
    functionCode,
    functionName,
    assignedBy
);

contact.AddFunction(function);
await contactRepository.UpdateAsync(contact);
await contactRepository.CommitAsync();

// The domain event will be published automatically,
// triggering RuleEngine evaluation
```

## Related Documentation

- [RuleEngine Architecture](../RuleEngine/.claude/architecture.md) - How functions trigger rule evaluation
- [SocialCare Person Roles](../SocialCare/.claude/person-roles.md) - Module-specific role assignments
