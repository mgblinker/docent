---
type: manual
---

# Roles & Permissions Management Component

This component provides a role-based interface for managing roles and their associated permissions using the Staff Management Admin API.

## Features

- **View Roles**: Display all roles in an expandable accordion interface
- **Filter by Module**: Filter roles by their associated module
- **Role-based Permission Management**: View permissions within each role context
- **Toggle Permission Status**: Activate/deactivate permissions within roles
- **Remove Permissions**: Remove permissions from specific roles
- **Responsive Design**: Optimized for desktop and mobile devices

## Architecture

### Role-Based Hierarchy

The component follows a role-centric approach where:

1. **Top Level**: Roles are the primary entities
2. **Module Filtering**: Roles can be filtered by their associated module
3. **Per-Role Permissions**: Each role contains its own set of permissions
4. **Permission Actions**: Permissions can be managed within the context of each role

## Components

### RolesPermissionsComponent

The main component that displays the permissions table and handles all CRUD operations.

### PermissionDialogComponent

A dialog component for creating and editing individual permissions.

### BulkPermissionsDialogComponent

A dialog component for registering multiple permissions simultaneously.

### ConfirmDialogComponent

A reusable confirmation dialog for delete operations.

## API Service

### RolesPermissionsApiService

Handles all API calls to the Staff Management Admin service:

- `getPermissions(module?: string)`: Retrieve permissions list
- `createPermission(request)`: Create a new permission
- `updatePermission(id, request)`: Update existing permission
- `deletePermission(id)`: Delete a permission
- `bulkRegisterPermissions(request)`: Register multiple permissions

## Usage

### In Routes

```typescript
{
  path: 'roles-permissions',
  loadComponent: () =>
    import('./components/roles-permissions/roles-permissions.component').then(
      (m) => m.RolesPermissionsComponent
    ),
  canActivate: [AuthGuard],
  title: 'Roles & Permissions Management'
}
```

### Direct Component Usage

```typescript
import { RolesPermissionsComponent } from './components/roles-permissions';

// In your template
<app-roles-permissions />;
```

## Data Models

### Permission Interface

```typescript
interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  category: string;
  isActive: boolean;
}
```

### API Request Models

- `CreatePermissionRequest`: For creating new permissions
- `UpdatePermissionRequest`: For updating existing permissions
- `BulkRegisterPermissionsRequest`: For bulk permission registration

## Styling

The component uses Angular Material components with custom SCSS styling that follows the application's design system. Key features:

- Responsive design for mobile and desktop
- Loading, error, and empty states
- Hover effects and animations
- Consistent color scheme and typography

## Dependencies

- Angular Material (Table, Dialog, Form Components)
- Reactive Forms
- RxJS for reactive programming
- Staff Management Admin Client (generated API client)

## Error Handling

- API errors are caught and displayed to the user via snackbar notifications
- Form validation with real-time error messages
- Confirmation dialogs for destructive operations

## Future Enhancements

- Role management functionality
- Permission assignment to roles
- Advanced filtering and search
- Export/import functionality
- Audit logging for permission changes
