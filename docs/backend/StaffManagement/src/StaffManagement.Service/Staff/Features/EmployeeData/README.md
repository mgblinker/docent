---
type: feature
---

# Employee Management Features

## Overview

This folder contains comprehensive employee lifecycle management features, reorganized from the distributed StaffManagement features into a cohesive structure.

## Structure

### Core Employee Operations

- **`API/EmployeeManagementController.cs`**: Unified controller handling all employee CRUD operations and lifecycle management
- **`DTOs/EmployeeDto.cs`**: Data transfer objects for employee information
- **`Queries/`**: Query objects for retrieving employee data
- **`Handlers/`**: Query handlers for employee data retrieval

### Lifecycle Management (`Lifecycle/`)

Employee onboarding, offboarding, and role change operations:

#### Commands (`Lifecycle/Commands/`)

- **`OnboardEmployeeCommand.cs`**: Command to onboard new employees
- **`OffboardEmployeeCommand.cs`**: Command to offboard existing employees
- **`ChangeEmployeeRoleCommand.cs`**: Command to change employee roles/positions

#### Handlers (`Lifecycle/Handlers/`)

- **`OnboardEmployeeCommandHandler.cs`**: Handles employee onboarding with validation
- **`OffboardEmployeeCommandHandler.cs`**: Handles employee offboarding and responsibility transfer
- **`ChangeEmployeeRoleCommandHandler.cs`**: Handles role changes with hierarchy validation

### Skills Management (`Skills/`)

Employee skills and competency management:

- **API, Commands, DTOs, Handlers, Queries**: Complete CRUD operations for employee skills
- Certificate upload and skill proficiency tracking

### Absence Management (`Absences/`)

Employee leave and absence tracking:

- **API, Commands, DTOs, Handlers, Queries**: Complete absence management system
- Different absence types (vacation, sick leave, etc.)

### Availability Management (`Availability/`)

Employee work time and availability scheduling:

- **API, Commands, Handlers, Queries**: Availability pattern management
- Task availability and team calendar features

## Key Features

### Employee Lifecycle Operations

1. **Onboarding**: Creates new employee records with manager assignment and duplicate checking
2. **Offboarding**: Deactivates employees and optionally transfers responsibilities to other staff
3. **Role Changes**: Updates job titles, departments, locations, and reporting structures with circular hierarchy prevention

### Business Logic

- **Duplicate Prevention**: Checks for existing employees by ContactId during onboarding
- **Hierarchy Validation**: Prevents circular management relationships during role changes
- **Responsibility Transfer**: Automatically transfers direct reports during offboarding
- **Permission-Based Access**: All operations require appropriate permissions

### API Endpoints

- `GET /api/v1.0/staff-management/employees` - List employees with filtering
- `GET /api/v1.0/staff-management/employees/{id}` - Get specific employee
- `GET /api/v1.0/staff-management/employees/me` - Get current user's employee record
- `POST /api/v1.0/staff-management/employees/onboard` - Onboard new employee
- `POST /api/v1.0/staff-management/employees/{id}/offboard` - Offboard employee
- `PUT /api/v1.0/staff-management/employees/{id}/role` - Change employee role

## Permissions

- `staff.read` - Read employee data
- `staff.read.own` - Read own employee data
- `staff.onboard` - Onboard new employees
- `staff.offboard` - Offboard existing employees
- `staff.update` - Update employee information

## Integration

This structure integrates existing features:

- Moved from `Features/OnboardEmployee/`
- Moved from `Features/GetEmployeeById/`, `Features/GetEmployeeList/`, `Features/GetEmployeeForCurrentUser/`
- Integrated `Features/Skills/`, `Features/Absences/`, `Features/Availabilities/`

All namespaces have been updated to reflect the new organizational structure under `Processity.StaffManagement.Staff.Features.Employee.*`.
