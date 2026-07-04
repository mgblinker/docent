---
type: feature
---

# Person Roles in SocialCare

## Overview

Person Roles are SocialCare module-specific role assignments that determine how persons interact with the social care system. These roles are automatically assigned via the RuleEngine when contact functions are assigned, implementing part of COREAPPS-994.

## Purpose

Person Roles define:
- **What a person can do** in the SocialCare module
- **How they appear** in case management (as social worker, participant, guardian, etc.)
- **Which features** they can access within social care workflows

## PersonRole Enum

**File**: `SocialCare.Models/Persons/Enums/PersonRole.cs`

Common roles include:
- `Participant` - Person receiving social care services
- `SocialWorker` - Social care professional managing cases
- `FamilyMember` - Family member of a participant
- `Guardian` - Legal guardian of a participant
- `Companion` - Family companion/support worker
- `CaseManager` - Case management staff
- (Additional roles as needed)

## Person Entity

**File**: `SocialCare/src/SocialCare/Persons/Entities/Person.cs`

### Role Management Methods

```csharp
// Add a role to a person
person.AddRole(PersonRole.SocialWorker)

// Remove a role from a person
person.RemoveRole(PersonRole.SocialWorker)

// Check if person has a role
bool hasSocialWorkerRole = person.HasRole(PersonRole.SocialWorker)

// Get all roles
IReadOnlyList<PersonRole> roles = person.Roles
```

### Properties

```csharp
public class Person
{
    public PersonId Id { get; }
    public ContactId ContactId { get; }
    public List<PersonRole> Roles { get; }
    // ... other properties
}
```

## Automatic Role Assignment via RuleEngine

### ModuleAssignmentEventHandler

**File**: `SocialCare/src/SocialCare/Persons/Features/PersonManagement/Lifecycle/FunctionSync/ModuleAssignmentEventHandler.cs`

This CAP subscriber handles `module.assignment.requested` events from the RuleEngine.

### Event Processing Flow

```
RuleEngine evaluates function assignment
    ↓
Rule action: PublishModuleEvent
    ↓
ModuleAssignmentRequestedEvent published
    ↓
SocialCare.ModuleAssignmentEventHandler receives event
    ↓
Filter: TargetModule == "SocialCare"?
    ↓ Yes
Map AssignmentValue to PersonRole enum
    ↓
Retrieve Person by ContactId
    ↓
If IsRevocation: Person.RemoveRole()
If Assignment: Person.AddRole()
    ↓
Persist to database
```

### Example: Assigning SocialWorker Role

**Trigger**: Contact assigned function "SOCIAL_WORKER"

**Event Payload**:
```json
{
  "contactId": "...",
  "userId": "...",
  "targetModule": "SocialCare",
  "assignmentType": "PersonRole",
  "assignmentValue": "SocialWorker",
  "functionCode": "SOCIAL_WORKER",
  "isRevocation": false,
  "activeFunctionCodes": ["SOCIAL_WORKER", "BACKOFFICE_STAFF"]
}
```

**Handler Logic**:
1. Check `targetModule == "SocialCare"` ✓
2. Parse `assignmentValue` "SocialWorker" → PersonRole.SocialWorker
3. Find Person by ContactId
4. Call `person.AddRole(PersonRole.SocialWorker)`
5. Save to database

### Example: Revoking SocialWorker Role

Same flow, but `isRevocation: true` triggers `person.RemoveRole(PersonRole.SocialWorker)`.

## Integration Events

### Consumed Events

| Event Name | Publisher | Purpose |
|------------|-----------|---------|
| `module.assignment.requested` | RuleEngine | Request to add/remove PersonRole |

**Event Details**:
- **Group**: `processity.social-care`
- **Filter**: `TargetModule = "SocialCare"`
- **AssignmentType**: "PersonRole" (expected value)
- **AssignmentValue**: Must match a PersonRole enum value (case-insensitive)

## Database Schema

Person roles are stored as a collection within the Person entity. Entity Framework Core maps this as a separate table or JSON column depending on configuration.

**Typical Structure** (many-to-many or owned collection):
```
Person
  ├─ PersonId (PK)
  ├─ ContactId (FK to CoreData.Contacts)
  └─ PersonRoles (collection)
       ├─ PersonRole enum value
       └─ ...
```

## API Endpoints

Person roles can be queried via SocialCare API:

**Controller**: `SocialCare/src/SocialCare/Persons/Features/PersonManagement/DataRetrieval/PersonDataRetrievalController.cs`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/social-care/v1.0/persons/{personId}` | Get person with roles |
| GET | `/api/social-care/v1.0/persons/by-role/{role}` | Get all persons with a specific role |
| GET | `/api/social-care/v1.0/persons/search?role={role}` | Search persons by role |

## Manual Role Management

While roles are typically assigned automatically via RuleEngine, they can also be managed manually:

**Commands**:
- `AddPersonRoleCommand` (`AddPersonRoleCommandHandler.cs`)
- `RemovePersonRoleCommand` (`RemovePersonRoleCommandHandler.cs`)
- `ChangePersonPrimaryRoleCommand` (`ChangePersonPrimaryRoleCommandHandler.cs`)
- `UpdatePersonRoleDataCommand` (`UpdatePersonRoleDataCommandHandler.cs`)

**Controller**: `PersonLifecycleController.cs`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/social-care/v1.0/persons/{personId}/roles` | Manually add role |
| DELETE | `/api/social-care/v1.0/persons/{personId}/roles/{role}` | Manually remove role |

Manual management should be used sparingly; prefer configuring rules for consistency.

## Usage in Business Logic

### Querying Persons by Role

```csharp
// Get all social workers
var socialWorkers = await personRepository.GetByRoleAsync(PersonRole.SocialWorker);

// Get a specific person with role check
var person = await personRepository.GetByIdAsync(personId);
if (person.HasRole(PersonRole.SocialWorker))
{
    // Allow case assignment
}
```

### Role-Based Authorization

Person roles influence what actions a user can perform:

```csharp
// Check if current user's contact has SocialWorker role
var currentPerson = await personRepository.GetByContactIdAsync(currentContactId);
if (!currentPerson.HasRole(PersonRole.SocialWorker))
{
    return Result.Fail("User is not authorized to manage cases");
}
```

## Example RuleEngine Configuration

**Scenario**: Automatically assign PersonRole.Companion when function "FAMILY_COMPANION" is assigned.

**Rule JSON** (managed via RuleEngine API):
```json
{
  "name": "Assign Companion Role on FAMILY_COMPANION Function",
  "consumers": [{ "consumerType": "FunctionMapping" }],
  "conditions": [
    { "field": "FunctionCode", "operator": "Equals", "value": "FAMILY_COMPANION" }
  ],
  "actions": [
    {
      "strategyType": "PublishModuleEvent",
      "parameters": {
        "TargetModule": "SocialCare",
        "AssignmentType": "PersonRole",
        "AssignmentValue": "Companion"
      }
    }
  ]
}
```

## Multiple Roles

A person can have multiple concurrent roles:

```csharp
person.AddRole(PersonRole.Participant);
person.AddRole(PersonRole.FamilyMember);

// Person now has both roles
person.Roles // [PersonRole.Participant, PersonRole.FamilyMember]
```

This is common in scenarios like:
- A participant who is also a family member of another participant
- A social worker who is also a case manager
- A person with multiple organizational responsibilities

## Role Lifecycle

### Active Functions Drive Roles

The `ActiveFunctionCodes` list in events allows the RuleEngine to make intelligent decisions:

**Example**:
- Contact has functions: ["SOCIAL_WORKER", "CASE_MANAGER"]
- Rule 1: If has SOCIAL_WORKER, assign PersonRole.SocialWorker
- Rule 2: If has CASE_MANAGER, assign PersonRole.CaseManager
- Result: Person gets both roles

**On Revocation**:
- Contact function "SOCIAL_WORKER" revoked
- ActiveFunctionCodes now: ["CASE_MANAGER"]
- Rule evaluates with IsRevocation=true
- PersonRole.SocialWorker removed, PersonRole.CaseManager remains

## Testing

### Test Data
**Location**: `SocialCare/test/SocialCare.TestData/Fakers/PersonFaker.cs`

Provides AutoFixture-based fakers for generating test persons with roles.

### Unit Tests
Coverage includes:
- Role addition/removal logic
- Module assignment event handling
- Role-based queries
- Multiple role scenarios

## Related Documentation

- [RuleEngine Architecture](../RuleEngine/.claude/architecture.md) - Rule evaluation and action execution
- [CoreData Contact Functions](../CoreData/.claude/contact-functions.md) - Function assignment triggers
- [SocialCare Architecture](./architecture.md) - Overall SocialCare module design
