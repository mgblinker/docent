---
type: feature
---

# Form Embed System

This system allows Processity forms to be embedded into external websites using iframe technology.

## Components

### EmbedFormComponent (`/src/app/public/components/embed-form/embed-form.component.ts`)

- Renders forms in a standalone, embeddable format
- No navigation or app-specific UI elements
- Handles form loading, validation, and submission
- Responsive design optimized for iframe embedding
- Shows loading states, error handling, and success messages

### PublicLayoutComponent (`/src/app/public/layout/public-layout.component.ts`)

- Minimal layout wrapper for public pages
- No authentication or app navigation
- Clean, responsive container for embedded content

### EmbedDemoComponent (`/src/app/public/components/embed-demo/embed-demo.component.ts`)

- Demonstration page showing how to embed forms
- Displays embed code for copying
- Live iframe preview
- Instructions and features overview

## Routes

### Public Routes (No Authentication Required)

- `/embed/form/:id` - Renders a specific form for embedding
- `/embed/demo` - Demo page showing embed functionality

## Usage

### Basic Embed Code

```html
<iframe
  src="https://webapp.processity.dev/embed/form/{FORM_ID}"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```

### Customization Options

- **Width**: Set to `100%` for responsive or specific pixel value
- **Height**: Adjust based on form complexity (typical range: 400-800px)
- **Frameborder**: Usually set to `0` for seamless integration

## Features

### Form Rendering

- ✅ Responsive design works on all devices
- ✅ Dynamic form loading from API
- ✅ Real-time validation
- ✅ File upload support
- ✅ Multiple field types (text, email, select, textarea, etc.)
- ✅ Custom styling and themes

### Security

- ✅ HTTPS-only serving
- ✅ CORS properly configured
- ✅ No sensitive data exposed to embedding site
- ✅ Secure form submission to backend API

### User Experience

- ✅ Loading states with spinner
- ✅ Clear error messages
- ✅ Success confirmation
- ✅ Option for multiple submissions
- ✅ Professional, clean design

## Demo Form

A demo form is available at `/embed/form/id-n2s8hi08n` with the following features:

- Contact form with name, email, subject, and message fields
- Dropdown selection for inquiry type
- Email validation
- Required field validation
- Newsletter subscription checkbox

## Implementation Notes

### Backend Integration

- Forms are loaded via `FormTemplateApiService.getFormLayout()`
- Submissions should be sent to dedicated form submission endpoint
- Form definitions include field configurations, validation rules, and styling

### Error Handling

- 404: Form not found
- 403: Form not publicly accessible
- 500: Server errors
- Network errors

### Future Enhancements

- [ ] Custom CSS injection for branding
- [ ] Webhook support for form submissions
- [ ] Analytics and submission tracking
- [ ] A/B testing capabilities
- [ ] Multi-language support
- [ ] Conditional field logic
- [ ] Payment integration

## Testing

Visit `/embed/demo` to see a live demonstration of the embed functionality with:

- Copy-ready embed code
- Live iframe preview
- Feature overview
- Implementation instructions

## Technical Architecture

```
External Website
    ↓ (iframe)
PublicLayoutComponent
    ↓
EmbedFormComponent
    ↓
FormRendererComponent (reused from form builder)
    ↓
FormTemplateApiService → Backend API
```

The system reuses the existing `FormRendererComponent` from the form builder module, ensuring consistency between the form builder preview and the embedded forms.
