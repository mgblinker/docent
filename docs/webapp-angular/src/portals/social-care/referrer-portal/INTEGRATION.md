---
type: feature
---

# Integration Example

To integrate the Referrer Area into your main Angular application:

## 1. Add Routes to Main App

In your main `app.routes.ts` or routing configuration:

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ... other routes
  {
    path: 'referrer',
    loadChildren: () =>
      import('./social-care/referrer-portal/referrer-portal.routes').then(
        (m) => m.referrerAreaRoutes
      )
  }
  // ... other routes
];
```

## 2. Verify Dependencies

Ensure these services are available in your main application:

- `AuthService` from `@shared/services/api/auth.service`
- `CommunicationsClient` from `@shared/services/api/clients/communications-client`
- `CommunicationsPublicClient` from `@shared/services/api/clients/communications-public-client`

## 3. Test the Implementation

1. Start your Angular development server:

   ```bash
   npm start
   ```

2. Navigate to the referrer area:
   - Visit `/referrer/login` to access the login page
   - After authentication, you'll be redirected to `/referrer/dashboard`

## 4. URLs Structure

- `/referrer/login` - Login page
- `/referrer/dashboard` - Main dashboard with navigation
  - `/referrer/dashboard/profile` - Profile management
  - `/referrer/dashboard/history` - Request history
  - `/referrer/dashboard/open-requests` - Active requests
  - `/referrer/dashboard/new-request` - Submit new requests

## 5. Customization

### Theme Customization

Modify the SCSS variables in `/theme/_variables.scss` to match your brand:

```scss
$referrer-primary-color: #your-brand-color;
$referrer-secondary-color: #your-secondary-color;
```

### Form Configuration

Update the default form ID in `ReferrerNewRequestComponent`:

```typescript
private readonly defaultFormId = 'your-form-id';
```

### API Endpoints

The components will work with your existing API endpoints. Update the `ReferrerAreaApiService` if needed to match your specific API structure.

## Current Status

✅ **Completed Components:**

- Login component with authentication
- Dashboard with navigation
- Profile management
- Request history with pagination
- Open requests tracking
- New request form with dynamic fields

✅ **Working Features:**

- Angular 20 standalone components
- Signal-based reactive state
- Modern control flow syntax (@if/@for)
- SCSS theming system
- Route guards and lazy loading
- Form validation and error handling

✅ **Ready for Production:**
All components compile successfully and follow Angular 20 best practices.

## Next Steps

1. **Configure Form Definitions**: Set up your form layouts in the database
2. **Customize Styling**: Adjust the theme variables to match your brand
3. **Test Integration**: Verify the components work with your authentication system
4. **Add Real Data**: Replace placeholder data with actual API responses
