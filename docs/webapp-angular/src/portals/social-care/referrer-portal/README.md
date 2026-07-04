---
type: feature
---

# Referrer Area

A complete Angular 20 implementation of a restricted public website section for booking request management.

## Overview

The Referrer Area provides a secure portal where authenticated users can:

- Log in with their credentials
- Manage their profile information
- View booking request history
- Track open/active requests
- Submit new booking requests using dynamic forms

## Architecture

### Technology Stack

- **Angular 20** with standalone components
- **Signals** for reactive state management
- **Modern control flow** (@if/@for syntax)
- **SCSS** with custom theming system
- **RxJS** for reactive programming
- **TypeScript** with strict typing

### Project Structure

```
src/social-care/referrer-portal/
├── components/
│   ├── login/                    # Authentication component
│   ├── dashboard/               # Main navigation hub
│   ├── profile/                 # User profile management
│   ├── history/                 # Booking request history
│   ├── open-requests/           # Active requests tracking
│   └── new-request/             # Dynamic form submission
├── services/
│   └── referrer-portal-api.service.ts  # API wrapper service
├── theme/                       # SCSS theming system
│   ├── _variables.scss          # Design tokens
│   ├── _components.scss         # Component styles
│   └── index.scss              # Main theme file
├── referrer-portal.routes.ts     # Routing configuration
└── index.ts                     # Public exports
```

### Key Features

#### 1. Authentication System

- Secure login with existing AuthService integration
- Route guards for protected areas
- Automatic redirection for authenticated/unauthenticated users
- Clean logout with session cleanup

#### 2. Dynamic Forms (New Request)

- Form definitions loaded from database
- Support for all standard form field types:
  - Text, Email, Number, Date, Time
  - Textarea, Select, Radio, Checkbox
  - Validation with error messages
  - Conditional field display
- Real-time form validation
- Submission tracking and success feedback

#### 3. Data Management

- Paginated booking history with search/filter
- Real-time open requests tracking
- Profile management with preference settings
- Optimistic UI updates with error handling

#### 4. Responsive Design

- Mobile-first CSS architecture
- Consistent spacing and typography
- Accessible form controls
- Loading states and error handling

## API Integration

### ReferrerAreaApiService

Wraps the existing `CommunicationsClient` and `CommunicationsPublicClient` with a clean interface:

```typescript
// Profile management
getProfile(): Observable<UserProfileDto>
updateProfile(profile: UserProfileDto): Observable<void>

// Request history
getBookingHistory(page?: number, pageSize?: number): Observable<InteractionHeaderDto[]>

// Active requests
getOpenRequests(): Observable<AppointmentDto[]>

// Dynamic forms
getFormLayout(formId: string): Observable<FormLayoutDto>
submitForm(formId: string, submission: FormSubmissionDto): Observable<void>
```

### DTO Compatibility

The service handles discrepancies between generated API client interfaces and actual backend responses using helper methods and type casting where necessary.

## Routing

### Protected Routes

All dashboard routes require authentication via `referrerAuthGuard`:

```
/referrer/dashboard/profile        # Profile management
/referrer/dashboard/history        # Request history
/referrer/dashboard/open-requests  # Active requests
/referrer/dashboard/new-request    # Submit new request
```

### Public Routes

```
/referrer/login                    # Authentication (redirects if already logged in)
```

### Route Configuration

```typescript
import { referrerAreaRoutes } from './referrer-portal.routes';

// In your main routes configuration:
{
  path: 'referrer',
  loadChildren: () => import('./referrer-portal/index').then(m => m.referrerAreaRoutes)
}
```

## Styling System

### SCSS Theme Architecture

The theme system provides consistent design tokens and reusable mixins:

#### Variables (\_variables.scss)

- Color palette with semantic naming
- Typography scale and font families
- Spacing system (4px grid)
- Breakpoints for responsive design
- Animation timing and easing

#### Component Styles (\_components.scss)

- Form control mixins
- Button variations
- Card layouts
- Loading states
- Error/success messaging

#### Usage in Components

```scss
@import '../../theme/index.scss';

.custom-component {
  @include referrer-card;
  @include referrer-button-primary;
}
```

## Component Details

### ReferrerLoginComponent

- Standalone login form with validation
- Integration with existing AuthService
- Custom styling separate from main app
- Error handling and loading states
- Automatic navigation after successful login

### ReferrerDashboardComponent

- Main navigation hub with tabs
- Router outlet for child components
- Logout functionality
- Responsive navigation menu

### ReferrerProfileComponent

- Form-based profile management
- Signal-based reactive state
- Save/reset functionality with confirmation
- Loading states during API calls
- Validation with error messaging

### ReferrerHistoryComponent

- Paginated table of booking requests
- Expandable row details
- Search and filter capabilities
- Helper methods for DTO property access
- Responsive table design

### ReferrerOpenRequestsComponent

- Real-time tracking of active requests
- Status indicators and progress tracking
- Appointment details with duration/timing
- Action buttons for request management

### ReferrerNewRequestComponent

- Dynamic form rendering from database definitions
- Support for all standard HTML form controls
- Real-time validation with custom error messages
- Multi-step form support (if configured)
- File upload capabilities (if enabled)
- Form state persistence during session

## Development Guidelines

### Component Standards

- Use standalone components with `selector: 'app-referrer-*'`
- Implement OnInit for initialization logic
- Use signals for reactive state management
- Inject services using the `inject()` function
- Import common modules: `CommonModule`, `FormsModule`, `ReactiveFormsModule`

### API Integration

- Always use the `ReferrerAreaApiService` wrapper
- Handle loading states with signals
- Implement proper error handling with user feedback
- Use type casting for DTO property mismatches when necessary

### Styling

- Import the theme: `styleUrls: ['../../theme/index.scss']`
- Use CSS Grid for layouts where appropriate
- Follow the 4px spacing system
- Implement responsive breakpoints
- Use semantic color variables

### Testing Considerations

- Components are designed for easy unit testing
- Services use dependency injection for mocking
- Signals provide clear state boundaries
- Error handling is centralized and predictable

## Integration

### Adding to Main Application

1. Import routes in main routing configuration
2. Ensure AuthService is properly configured
3. Verify API clients are available via dependency injection
4. Include theme files in global styles if needed

### Custom Form Configuration

Form definitions should be stored in the database with this structure:

```typescript
interface FormLayoutDto {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldLayoutDto[];
  settings?: {
    submitButtonText?: string;
    allowMultipleSubmissions?: boolean;
    confirmationMessage?: string;
  };
}
```

### Environment Configuration

Ensure these environment variables are configured:

- API base URLs for communications services
- Authentication service endpoints
- Any feature flags for form functionality

## Future Enhancements

### Planned Features

- Real-time notifications for request status changes
- File upload support for attachments
- Multi-language support for forms
- Advanced filtering and search in history
- Export functionality for request data
- Offline form drafting capability

### Technical Improvements

- Implement virtual scrolling for large datasets
- Add progressive web app features
- Optimize bundle size with lazy loading
- Add comprehensive error boundary handling
- Implement caching strategies for frequently accessed data

## Troubleshooting

### Common Issues

#### DTO Property Access Errors

If you encounter TypeScript errors about missing properties on DTOs:

1. Check if the property exists in the actual API response
2. Use type casting: `(item as any).propertyName`
3. Add fallback values for missing properties
4. Consider updating the generated API client if the issue persists

#### Authentication Issues

- Verify AuthService is properly configured in main app
- Check that cookies are being set correctly
- Ensure API endpoints support the authentication method
- Verify route guards are applied correctly

#### Styling Problems

- Ensure theme files are imported correctly
- Check that SCSS compilation is working
- Verify no global styles are conflicting
- Test responsive breakpoints on different devices

#### Form Loading Issues

- Verify form definitions exist in database
- Check API endpoints for form retrieval
- Ensure proper error handling for missing forms
- Test with different form field configurations

This implementation provides a complete, production-ready referrer area that follows Angular 20 best practices and integrates seamlessly with existing authentication and API infrastructure.
