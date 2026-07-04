---
type: howto
---

# Feature Discovery Controller Implementation Guide

## Overview

Each module must create its own feature discovery controller that inherits from `FeatureDiscoveryControllerBase` in SharedKernel.

## Implementation Steps

### 1. Create Controller

Create a controller in your module at: `{Module}/src/{Module}/Licensing/Controllers/{ModuleName}FeatureDiscoveryController.cs`

### 2. Controller Template

```csharp
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Processity.SharedKernel.Licensing.FeatureDiscovery.Controllers;

namespace Processity.{Module}.Licensing.Controllers;

/// <summary>
/// Controller for {Module} module feature discovery.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("api/licensing/features/{module-name-lowercase}")]
[Authorize]
public class {Module}FeatureDiscoveryController(IServiceProvider serviceProvider)
    : FeatureDiscoveryControllerBase(serviceProvider)
{
    /// <inheritdoc />
    protected override string GetModuleName() => "{Module}";
}
```

### 3. Route Pattern

The route **must** follow this pattern:

```
[Route("api/licensing/features/{module-name-lowercase}")]
```

Examples:

- Education: `/api/licensing/features/education`
- SocialCare: `/api/licensing/features/socialcare`
- StaffManagement: `/api/licensing/features/staffmanagement`

### 4. Module Examples

#### Education Module

```csharp
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Processity.SharedKernel.Licensing.FeatureDiscovery.Controllers;

namespace Processity.Education.Core.Licensing.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/licensing/features/education")]
[Authorize]
public class EducationFeatureDiscoveryController(IServiceProvider serviceProvider)
    : FeatureDiscoveryControllerBase(serviceProvider)
{
    protected override string GetModuleName() => "Education";
}
```

#### SocialCare Module

```csharp
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Processity.SharedKernel.Licensing.FeatureDiscovery.Controllers;

namespace Processity.SocialCare.Licensing.Controllers;

[ApiController]
[ApiVersion("1.0")]
[Route("api/licensing/features/socialcare")]
[Authorize]
public class SocialCareFeatureDiscoveryController(IServiceProvider serviceProvider)
    : FeatureDiscoveryControllerBase(serviceProvider)
{
    protected override string GetModuleName() => "SocialCare";
}
```

## How It Works

### Base Controller Features

The `FeatureDiscoveryControllerBase` provides:

- Automatic provider lookup via `GetFeatureDiscoveryProviderType()`
- Standard endpoint: `GET /api/licensing/features/{module}`
- Error handling and logging
- Consistent response format

### Default Provider Lookup

By default, the base controller looks for a provider with this naming convention:

```
{AssemblyName}.Common.Licensing.{ModuleName}FeatureDiscoveryProvider
```

Example for Education:

- Assembly: `Education.Core`
- Module Name: `Education`
- Provider Type: `Education.Core.Common.Licensing.EducationFeatureDiscoveryProvider`

### Custom Provider Type

If your provider doesn't follow the convention, override `GetFeatureDiscoveryProviderType()`:

```csharp
protected override Type? GetFeatureDiscoveryProviderType()
{
    return typeof(MyCustomFeatureDiscoveryProvider);
}
```

## Response Format

```json
{
  "moduleName": "Education",
  "features": [
    {
      "featureName": "learning-paths",
      "displayName": "Learning Paths",
      "description": "Create and manage learning paths",
      "category": "Core",
      "minimumTier": "Professional",
      "isBaseFeature": false,
      "dependsOn": []
    }
  ]
}
```

## API Gateway Integration

The API Gateway's Feature Orchestration Service will automatically discover features from all modules by calling:

```
GET http://processity-backend-dev:80/api/licensing/features/education
GET http://processity-backend-dev:80/api/licensing/features/socialcare
GET http://processity-backend-dev:80/api/licensing/features/staffmanagement
// ... etc for all modules
```

## Checklist for Each Module

- [ ] Feature Discovery Provider created in `Common/Licensing/{Module}FeatureDiscoveryProvider.cs`
- [ ] Provider registered in module DI: `services.RegisterFeatureDiscoveryProvider<TProvider>("ModuleName")`
- [ ] Controller created in `Licensing/Controllers/{Module}FeatureDiscoveryController.cs`
- [ ] Controller route matches pattern: `/api/licensing/features/{module-lowercase}`
- [ ] `GetModuleName()` returns correct module name
- [ ] Controller registered automatically via module's `AddControllers()` call
