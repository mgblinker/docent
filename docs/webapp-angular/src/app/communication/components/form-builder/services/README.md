---
type: feature
---

# Form Builder Services

Organized service architecture following SOLID principles.

## Structure

```
services/
├── builders/          # Form and control construction
├── factories/         # Dynamic field creation (Strategy pattern)
├── mapping/           # Data transformation (API ↔ Domain)
├── validation/        # Form validation and error handling
├── utilities/         # Helper services
├── facades/           # Backward-compatible facades
└── strategies/        # Field creation strategies
```

## Quick Reference

### Mapping Services (`./mapping/`)

Convert between different data representations:

- `FormFieldTypeMapperService`: API types → FormFieldType enum
- `FormLayoutMapperService`: FormLayoutDto → FormDefinition
- `FormSubmissionMapperService`: Form values → API submission format

### Validation Services (`./validation/`)

- `FormValidatorBuilderService`: Build validators and error messages

### Builder Services (`./builders/`)

Construct forms and controls:

- `FormBuilderService`: High-level form construction
- `FormControlBuilderService`: Create reactive form controls

### Factory Services (`./factories/`)

Dynamic field creation using Strategy pattern:

- `FieldFactoryService`: Factory for creating field components
- `FieldStrategyRegistry`: Maps field types to strategies

### Utility Services (`./utilities/`)

Supporting functionality:

- `FormFieldSorterService`: Sort fields by position
- `ModelDiscoveryService`: Discover and analyze form models
- `ModuleResolverService`: Resolve Angular modules dynamically
- `TemplateService`: Template processing
- `FormMockService`: Mock data generation

### Facade Services (`./facades/`)

- `FormMappingService`: Backward-compatible facade delegating to specialized services (deprecated)

## Usage

```typescript
// Import from barrel export
import { FormLayoutMapperService, FormControlBuilderService } from './services';

// Or import specialized services directly
import { FormLayoutMapperService } from './services/mapping/form-layout-mapper.service';
```
