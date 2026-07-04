---
type: howto
---

# Two-Step Translation File Upload

This feature implements a two-step process for uploading translation files that allows users to review and selectively apply changes before they are committed to the database.

## Backend Components

### New DTOs
- `TranslationChangeDto` - Represents a single translation change (addition, update, or deletion)
- `TranslationComparisonResultDto` - Contains the complete comparison result with all detected changes

### New Commands
- `CompareTranslationFileCommand` - Compares uploaded file with existing translations
- `ApplyTranslationChangesCommand` - Applies selected changes from the comparison

### New Handlers
- `CompareTranslationFileHandler` - Analyzes the uploaded file and detects changes
- `ApplyTranslationChangesHandler` - Applies the user-selected changes

### New API Endpoints
- `POST /api/v1.0/translations/compare/{language}` - Compare uploaded file
- `POST /api/v1.0/translations/apply/{language}` - Apply selected changes

## Frontend Components

### New Angular Component
- `TwoStepTranslationUploadDialogComponent` - Replaces the simple upload dialog with a two-step process

## Usage Flow

1. **Step 1: File Upload**
   - User selects language and uploads JSON file
   - System analyzes file and compares with existing translations
   - Dialog advances to step 2 with detected changes

2. **Step 2: Review Changes**
   - Changes are categorized into tabs: Additions, Updates, Deletions
   - All changes are selected by default
   - User can select/deselect individual changes or use "Select All"/"Select None"
   - Apply button shows count of selected changes

3. **Application**
   - Only selected changes are applied to the database
   - Success feedback shows number of changes applied

## Benefits

- **Safe Updates**: Users can review all changes before applying
- **Selective Application**: Users can choose which changes to apply
- **Change Categorization**: Clear distinction between additions, updates, and deletions
- **Rollback Prevention**: No accidental overwrites of existing translations
