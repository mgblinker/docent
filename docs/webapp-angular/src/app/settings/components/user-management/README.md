---
type: manual
---

# User Management Component

A comprehensive Angular component for managing users and their role assignments within the settings module.

## Overview

The User Management component provides a complete CRUD interface for user settings, including:

- Creating new user accounts
- Updating user information
- Managing user role assignments
- Activating/deactivating users
- Filtering and searching users

## Architecture

### Components

1. **UserManagementComponent** - Main component with user list and management functions
2. **UserDialogComponent** - Modal dialog for creating/editing users
3. **UserRolesDialogComponent** - Modal dialog for managing user role assignments

### Service

**UserManagementApiService** - Wraps the AuthenticationClient to provide:

- User registration and management
- Role assignment operations
- User role queries
- Authentication-related operations

## Features

### User Management

- **Create Users**: Register new users with validation
- **Edit Users**: Update user information (name, email, status)
- **User Status**: Activate/deactivate user accounts
- **Global Search**: Search users by name, email, or username with API integration
- **Filter & Search**: Filter users by name, email, role, or status
- **Real-time Search**: Debounced search with automatic API calls

### Role Management

- **View Roles**: Display assigned roles with visual indicators
- **Assign Roles**: Add multiple roles to users
- **Remove Roles**: Remove roles from users
- **Role Discovery**: Browse available roles with descriptions
- **Batch Operations**: Efficiently update multiple role assignments

### User Interface

- **Responsive Design**: Mobile-friendly layout
- **Material Design**: Consistent UI using Angular Material
- **Visual Feedback**: Color-coded status indicators and role badges
- **Search & Filter**: Real-time filtering capabilities
- **Confirmation Dialogs**: Prevent accidental operations

## API Integration

The component uses the following Auth API endpoints:

### User Operations

- `GET /api/v{version}/users/me` - Get current user details
- `GET /api/v{version}/users/{id}` - Get user by ID
- `GET /api/v{version}/users?searchTerm={searchTerm}` - Get users with optional search
- `POST /api/v{version}/account/register` - Register new user

### Role Operations

- `GET /api/v{version}/auth/roles` - Get all available roles
- `GET /api/v{version}/auth/roles/users/{userId}` - Get user roles
- `POST /api/v{version}/auth/roles/users/{userId}/roles/{roleName}` - Assign role
- `DELETE /api/v{version}/auth/roles/users/{userId}/roles/{roleName}` - Remove role
- `POST /api/v{version}/auth/roles` - Create/update role
- `GET /api/v{version}/auth/roles/users/{userId}/roles/{roleName}/check` - Check role assignment

## Usage

### Basic Implementation

```typescript
import { UserManagementComponent } from './components/user-management/user-management.component';

@Component({
  // ... component configuration
  imports: [UserManagementComponent]
})
export class AdminComponent {}
```

### Template Usage

```html
<app-user-management></app-user-management>
```

### Route Configuration

```typescript
{
  path: 'users',
  component: UserManagementComponent,
  data: { title: 'User Management' }
}
```

## Data Models

### User Interface

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  contactId?: string;
  isActive: boolean;
}
```

### Role Interface (from Auth API)

```typescript
interface AuthServiceRoleDto {
  id?: string;
  name?: string;
  description?: string;
  module?: string;
  isActive?: boolean;
}
```

## Configuration

### Service Dependencies

- `UserManagementApiService` - API operations
- `MatDialog` - Modal dialogs
- `MatSnackBar` - User notifications
- `FormBuilder` - Reactive forms

### Material Modules Required

- MatTableModule
- MatButtonModule
- MatIconModule
- MatFormFieldModule
- MatInputModule
- MatSelectModule
- MatCheckboxModule
- MatCardModule
- MatDialogModule
- MatSnackBarModule
- MatProgressSpinnerModule
- MatChipsModule
- MatMenuModule
- MatListModule

## Customization

### Styling

The component uses SCSS with responsive breakpoints and Material theme integration:

```scss
// Custom role badge colors
.mat-mdc-chip.mat-primary {
  --mdc-chip-selected-container-color: #1976d2;
}
.mat-mdc-chip.mat-accent {
  --mdc-chip-selected-container-color: #424242;
}
.mat-mdc-chip.mat-warn {
  --mdc-chip-selected-container-color: #f57c00;
}
```

### Form Validation

- Name: Required
- Email: Required, valid email format
- Password: Minimum 6 characters (for new users)
- Password Confirmation: Must match password

### Error Handling

- API errors are handled gracefully with user-friendly messages
- Network failures show retry options
- Form validation provides immediate feedback

## Security Considerations

- Password fields use proper input types and visibility toggles
- Role assignments are validated server-side
- User status changes require confirmation
- All API calls include proper error handling

## Performance Features

- Lazy loading of role data
- Efficient filtering with reactive forms
- Batch role assignment operations
- Optimized material table rendering

## Accessibility

- Proper ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader compatible
- High contrast mode support
- Focus management in dialogs

## Future Enhancements

Potential improvements include:

- User export functionality
- Bulk user operations
- Advanced role filtering
- User activity tracking
- Profile picture management
- Password reset functionality

## Dependencies

- Angular 15+
- Angular Material 15+
- RxJS 7+
- Auth API Client
- Shared components (ConfirmDialog)

## Testing

The component includes comprehensive test coverage for:

- User CRUD operations
- Role assignment workflows
- Form validation
- Error handling scenarios
- UI interactions
