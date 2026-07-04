---
type: manual
---

# Translations Management

This module provides full CRUD (Create, Read, Update, Delete) functionality for managing translations in the application using the API-based approach.

## Features

- **View Translations**: Browse translations by module and language
- **Filter**: Search and filter translations by module, language, and key
- **Create**: Add new translations with validation
- **Edit**: Update existing translation values
- **Delete**: Remove translations with confirmation
- **Real-time Updates**: Changes are immediately reflected in the application

## Components

### TranslationsManagementComponent

The main component that provides the translations management interface.

**Features:**

- Filterable table view of translations
- Module and language selection
- Key search functionality
- CRUD operations via dialog

### TranslationDialogComponent

Modal dialog for creating and editing translations.

**Features:**

- Form validation
- Module/language/key constraints
- Value editing with multiline support
- Edit mode locks module, language, and key fields

### TranslationsManagementService

Service that handles all API operations for translations.

**Methods:**

- `getTranslation(id: string)`: Get a single translation by ID
- `getModuleTranslations(module: string, language: string)`: Get all translations for a module/language
- `createTranslation(request: TranslationCreateRequest)`: Create a new translation
- `updateTranslation(request: TranslationUpdateRequest)`: Update an existing translation
- `deleteTranslation(id: string)`: Delete a translation
- `isValidTranslationKey(key: string)`: Validate translation key format
- `generateKeySuggestion(module: string, description: string)`: Generate key suggestions

## Usage

### Accessing the Feature

Navigate to **settings > Translations** in the application menu.

### Creating a Translation

1. Click the "Create New" button
2. Select the module and language
3. Enter a valid translation key (format: `section.subsection.key`)
4. Enter the translation value
5. Click "Create"

### Editing a Translation

1. Find the translation in the table
2. Click the edit icon
3. Modify the value (module, language, and key are locked)
4. Click "Update"

### Deleting a Translation

1. Find the translation in the table
2. Click the delete icon
3. Confirm the deletion

### Filtering Translations

- **Module Filter**: Select a specific module to view its translations
- **Language Filter**: Select a language to view translations in that language
- **Key Search**: Enter text to search within translation keys
- Use "Clear" to reset all filters
- Use "Refresh" to reload data

## Translation Key Format

Translation keys must follow the pattern: `module.section.subsection.key`

**Examples:**

- `settings.translations.title`
- `core-data.navigation.contact-list-title`
- `shared.validation.required-field`

**Rules:**

- Only alphanumeric characters, dots, and hyphens allowed
- Must start and end with alphanumeric characters
- Case-insensitive

## Available Modules

The system supports the following modules:

- settings
- care-management
- communication
- course-management
- core-data
- event-management
- login
- main
- sales
- shared
- services
- social-care
- staff-management

## Available Languages

Currently supported languages:

- en (English)
- de (German)

## Integration with Translation System

This feature integrates with the API-based translation system:

- Changes are immediately available to the `TranslationsWrapperService`
- The `ApiTranslateLoader` will fetch updated translations
- Use `translationsService.reloadTranslations()` to refresh translations in components

## Error Handling

The service includes comprehensive error handling:

- Network errors are caught and logged
- Invalid operations show user-friendly messages
- Validation errors are displayed in forms
- Failed operations show snackbar notifications

## Security

- All operations require authentication via `AuthGuard`
- Tenant isolation is handled by the API
- User permissions should be configured at the API level
