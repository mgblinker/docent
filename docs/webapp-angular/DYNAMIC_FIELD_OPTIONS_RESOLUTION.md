---
type: feature
---

# Dynamic Field Options Resolution System

## Overview

This system implements a **fully generic, configuration-based** hybrid approach for resolving form field options:
- **Backend Resolution**: For enumeration-based fields (simple types, enums)
- **Frontend Resolution**: For record-based fields (querying actual data)

**Key Innovation**: Adding a new entity requires **ZERO code changes** - just add a configuration entry!

## Architecture

### Backend Components

1. **FormFieldOptionsMetadata** (C#)
   - Location: `Communications.Models/Templates/ValueObjects/FormFieldOptionsMetadata.cs`
   - Contains: Module, Entity, Field, OptionsSource, Parameters
   - Included in `FormFieldLayoutDto.OptionsMetadata`

2. **FormLayoutEnrichmentService** (C#)
   - Checks `OptionsSource` to determine resolution strategy
   - If "records": Returns metadata for frontend resolution
   - If "enumeration": Resolves options in backend via discovery API

3. **IFormOptionsResolver** (C#)
   - Interface with `ExtractFieldMetadataAsync` method
   - Implemented by `ApiGatewayOptionsResolver` and `CommunicationsFormOptionsResolver`

### Frontend Components

1. **FieldOptionsResolverService** (TypeScript)
   - Location: `app/communication/services/field-options-resolver.service.ts`
   - Main service for dynamic options resolution
   - Delegates to module-specific services via registry

2. **ModuleServiceRegistry** (TypeScript)
   - Registry pattern for module-specific data services
   - Allows dynamic lookup: module name → service instance

3. **IModuleDataService** (TypeScript)
   - Interface that module-specific services must implement
   - Method: `getOptionsForEntity(entity, field?, parameters?)`

4. **GenericEntityDataService** (TypeScript) ⭐ NEW
   - Location: `app/communication/services/generic-entity-data.service.ts`
   - **Fully generic HTTP-based entity querying**
   - Uses `EntityEndpointConfig` for declarative endpoint configuration
   - Handles GET/POST, query params, filtering, nested responses
   - **No code changes needed to add new entities**

5. **Entity Configuration Registry** (TypeScript) ⭐ NEW
   - Location: `social-care/shared/config/entity-endpoints.config.ts`
   - **Declarative configuration for all entities**
   - Maps entity names to endpoints, label/value selectors
   - Includes alias mapping for normalization
   - Example:
     ```typescript
     'Person': {
       endpoint: '/api/social-care/v1.0/persons',
       labelSelector: (p) => `${p.firstName} ${p.lastName}`,
       valueSelector: (p) => p.id,
       queryParams: { limit: 100 }
     }
     ```

6. **SocialCareDataService** (TypeScript)
   - Location: `social-care/shared/services/social-care-data.service.ts`
   - Implements `IModuleDataService` for social care module
   - **Now uses GenericEntityDataService** - no hardcoded entity logic
   - Normalizes entity names and looks up configuration
   - Routes to generic service for all queries

7. **GenericFormRendererComponent** (TypeScript)
   - Updated to handle `optionsMetadata`
   - Extracts metadata from field.style['optionsMetadata']
   - Calls `FieldOptionsResolverService` for dynamic resolution

## Data Flow

### Enumeration Fields (Backend Resolution)
```
1. Frontend requests form layout
2. Backend enrichment service detects OptionsSource = "enumeration"
3. Backend queries discovery API
4. Backend includes resolved options in FormFieldLayoutDto.Options
5. Frontend renders dropdown with provided options
```

### Record Fields (Frontend Resolution)
```
1. Frontend requests form layout
2. Backend enrichment service detects OptionsSource = "records"
3. Backend includes metadata in FormFieldLayoutDto.OptionsMetadata
   {
     "module": "social-care",
     "entity": "Person",
     "field": "ServiceType",
     "optionsSource": "records"
   }
4. Frontend extracts metadata from field
5. Frontend calls FieldOptionsResolverService.resolveOptions(metadata)
6. Service looks up "social-care" → SocialCareDataService
7. SocialCareDataService queries PersonsApiService
8. Service returns options: [{ label, value }]
9. Frontend updates field.options and renders dropdown
```

## Usage

### Adding a New Entity (Zero Code Changes!)

To add support for a new entity, you only need to add configuration:

**Step 1**: Add entry to `entity-endpoints.config.ts`:

```typescript
export const SOCIAL_CARE_ENTITY_CONFIGS: { [entity: string]: EntityEndpointConfig } = {
  // ... existing configs
  
  'YourNewEntity': {
    endpoint: '/api/social-care/v1.0/your-entities',
    labelSelector: (entity: any) => entity.name || 'Unknown',
    valueSelector: (entity: any) => entity.id?.value || entity.id,
    queryParams: { limit: 100 },
    // Optional: filter, dataPath, method
  }
};
```

**Step 2**: Add alias (optional, for case-insensitivity/plurals):

```typescript
export const ENTITY_NAME_ALIASES: { [alias: string]: string } = {
  // ... existing aliases
  'YourNewEntities': 'YourNewEntity',
  'yournewentity': 'YourNewEntity'
};
```

**That's it!** The system will automatically:
- Accept metadata: `{ module: "social-care", entity: "YourNewEntity", optionsSource: "records" }`
- Normalize entity name using aliases
- Look up configuration
- Query the endpoint with GenericEntityDataService
- Map results to options using your selectors
- Return `[{ label, value }]` to the form

### Adding a New Module Service

1. **Create the service** implementing `IModuleDataService`:

```typescript
@Injectable({ providedIn: 'root' })
export class MyModuleDataService implements IModuleDataService {
  getOptionsForEntity(
    entity: string,
    field?: string,
    parameters?: any
  ): Observable<FieldOption[]> {
    // Route to appropriate API based on entity
    switch (entity.toLowerCase()) {
      case 'course':
        return this.getCourseOptions();
      default:
        return of([]);
    }
  }
}
```

2. **Register the service** in `ModuleServicesInitializer`:

```typescript
initialize(): void {
  this.registry.register('my-module', this.myModuleService);
}
```

### Backend Field Definition

When defining a form field that needs dynamic options:

```csharp
new FormFieldLayoutDto
{
    Id = "field-service-type",
    Type = FormFieldType.Select,
    Label = "Service Type",
    OptionsMetadata = new FormFieldOptionsMetadata
    {
        Module = "social-care",
        Entity = "Service",
        Field = "Type",
        OptionsSource = "records"
    }
}
```

### Frontend Integration

The `GenericFormRendererComponent` automatically handles both scenarios:

```typescript
// Backend-resolved (options already populated)
<select [formControlName]="field.id">
  <option *ngFor="let opt of field.options" [value]="opt.value">
    {{ opt.label }}
  </option>
</select>

// Frontend-resolved (options populated dynamically)
// Same template, but options are loaded via FieldOptionsResolverService
```

## Benefits

1. **Separation of Concerns**: Backend handles enums, frontend handles data queries
2. **Performance**: Enumeration lookups cached at form level; record queries optimized per module
3. **Flexibility**: Easy to add new modules and entities
4. **Type Safety**: Strong typing in both C# and TypeScript
5. **Scalability**: Module services can implement caching, pagination, filtering

## Configuration

Add to `app.config.ts`:

```typescript
import { APP_INITIALIZER } from '@angular/core';
import { 
  ModuleServicesInitializer, 
  initializeModuleServices 
} from '@shared/services/module-services-initializer.service';

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeModuleServices,
      deps: [ModuleServicesInitializer],
      multi: true
    }
  ]
};
```

## Testing

### Backend Tests
- Test `FormLayoutEnrichmentService` with both OptionsSource values
- Verify metadata extraction in resolvers
- Test strategy pattern (EnumerationStrategy, RecordsStrategy)

### Frontend Tests
- Mock `IModuleDataService` implementations
- Test `FieldOptionsResolverService.resolveOptions()`
- Test `GenericFormRendererComponent` with metadata
- Verify registry lookup and service delegation

## Future Enhancements

- **Caching**: Add caching layer for frequently accessed options
- **Pagination**: Support large datasets with server-side pagination
- **Search/Filter**: Add search capability for record-based dropdowns
- **Lazy Loading**: Load options only when dropdown is opened
- **Prefetch**: Preload options for critical fields during form initialization
