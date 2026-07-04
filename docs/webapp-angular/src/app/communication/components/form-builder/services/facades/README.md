---
type: feature
---

# Facade Services

Backward-compatible facade services that delegate to specialized services.

## Services

- **form-mapping.service.ts**: Facade maintaining backward compatibility while delegating to specialized SOLID-compliant services. All methods marked `@deprecated` with guidance to use specialized services directly from `mapping/`, `validation/`, and `builders/` folders.

## Purpose

Facades provide a simplified interface and maintain backward compatibility during architectural transitions. Components using `FormMappingService` continue to work without changes, while new code can inject specialized services directly for clearer dependencies.
