---
type: feature
---

# Mapping Services

Services responsible for converting between different data representations.

## Services

- **form-field-type-mapper.service.ts**: Converts API field types (strings/numbers) to internal `FormFieldType` enum
- **form-layout-mapper.service.ts**: Converts `FormLayoutDto` (API) to `FormDefinition` (domain model)
- **form-submission-mapper.service.ts**: Transforms form values to API submission format with metadata handling
