---
type: howto
---

# Translation Upload Feature

## Overview
The translation upload feature allows uploading ngx-translate style JSON files to bulk import translations.

## API Endpoint
```
POST /api/v1.0/translations/upload/{language}
```

### Parameters
- `language`: The language code (e.g., "de", "en", "fr")
- `file`: The JSON file containing translations

### Expected JSON Format
The JSON file should have module names as root keys, with nested translation keys:

```json
{
  "shared": {
    "buttons": {
      "cancel": "Abbrechen",
      "submit": "Absenden"
    },
    "errors": {
      "fetch-data": "Fehler beim Abrufen von {{type}}: {{error}}"
    }
  },
  "orders": {
    "status": {
      "pending": "Ausstehend",
      "completed": "Abgeschlossen"
    }
  }
}
```

### Processing Logic
1. Each root key becomes a module (e.g., "shared", "orders")
2. Nested objects are flattened with dot notation (e.g., "buttons.cancel", "status.pending")
3. Each translation is created/updated in the database with:
   - Module: from root key
   - Language: from URL parameter
   - Key: flattened path
   - Value: string value

### Response
Returns the number of translations processed successfully.

### Example Usage
```bash
curl -X POST \
  "https://api.example.com/api/v1.0/translations/upload/de" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@de.json"
```

### Generated Database Records
From the example above, these records would be created:

| Module | Language | Key | Value |
|--------|----------|-----|-------|
| shared | de | buttons.cancel | Abbrechen |
| shared | de | buttons.submit | Absenden |
| shared | de | errors.fetch-data | Fehler beim Abrufen von {{type}}: {{error}} |
| orders | de | status.pending | Ausstehend |
| orders | de | status.completed | Abgeschlossen |
