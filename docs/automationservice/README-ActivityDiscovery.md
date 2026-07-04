---
type: feature
---

# Activity Discovery Service Implementation

## Overview

The Activity Discovery Service provides dynamic discovery and metadata management for workflow activities in the Processity workflow system. This implementation allows the workflow designer to automatically discover available activities at runtime, providing a rich, extensible interface for building workflows.

## Architecture

### Core Components

1. **Activity Discovery Service** (`IActivityDiscoveryService`)
   - Scans assemblies for workflow activities using reflection
   - Caches activity metadata for performance
   - Provides search and filtering capabilities
   - Manages activity instantiation

2. **Activity Metadata Models**
   - `ActivityMetadata`: Complete metadata for an activity
   - `ActivityParameterMetadata`: Parameter definitions with validation rules
   - `ParameterValidationRule`: Validation constraints for parameters

3. **REST API Controllers**
   - `GetAllActivitiesController`: Retrieve all activities and categories
   - `GetActivityByIdController`: Get specific activity metadata
   - `GetActivitiesByCategoryController`: Filter activities by category

4. **Frontend Integration**
   - Enhanced `WorkflowServiceClient` with discovery methods
   - Updated `WorkflowDesigner` with dynamic activity toolbox
   - Real-time activity search and filtering

## Key Features

### Dynamic Activity Discovery
- Automatic scanning of loaded assemblies for `IActivity` implementations
- Runtime discovery without need for manual registration
- Support for activities in any loaded assembly

### Rich Metadata System
- Comprehensive activity information (name, description, category, icon, color)
- Detailed parameter definitions with data types and validation rules
- Categorization and tagging for organization
- UI hints for improved user experience

### Caching and Performance
- In-memory caching of discovered activities (30-minute TTL)
- Lazy loading with background refresh capabilities
- Efficient reflection-based discovery

### Frontend Integration
- Dynamic activity toolbox with search and filtering
- Category-based organization
- Visual indicators for different activity types
- Real-time updates and refresh capabilities

## Implementation Details

### Activity Discovery Process

1. **Assembly Scanning**: The service scans all loaded assemblies for types implementing `IActivity`
2. **Metadata Extraction**: For each activity type, metadata is extracted by creating temporary instances
3. **Categorization**: Activities are automatically categorized based on namespace and type information
4. **Caching**: Results are cached in memory for performance

### API Endpoints

```
GET /api/v1/activities - Get all activities
GET /api/v1/activities/{id} - Get specific activity
GET /api/v1/activities/category/{category} - Get activities by category
GET /api/v1/activities/categories - Get all categories
GET /api/v1/activities/search?searchTerm={term} - Search activities
POST /api/v1/activities/refresh - Refresh activity cache
```

### Frontend Integration

The workflow designer now features:
- **Dynamic Activity Toolbox**: Automatically populated with discovered activities
- **Search Functionality**: Real-time filtering of activities
- **Category Filtering**: Dropdown filter for activity categories
- **Visual Indicators**: Color-coded activities by category
- **Metadata Display**: Rich tooltips with activity descriptions and tags

## Configuration

### Service Registration

The activity discovery service is registered in the workflow service DI container:

```csharp
services.AddScoped<IActivityDiscoveryService, ActivityDiscoveryService>();
services.AddMemoryCache();
```

### Frontend Client Configuration

The WorkflowServiceClient is configured to call the new discovery endpoints:

```csharp
public async Task<List<ActivityMetadataDto>> GetAllActivitiesAsync()
public async Task<ActivityMetadataDto?> GetActivityAsync(string activityId)
public async Task<List<string>> GetCategoriesAsync()
public async Task<List<ActivityMetadataDto>> SearchActivitiesAsync(string searchTerm)
```

## Creating Custom Activities

To create a discoverable workflow activity:

1. **Inherit from HttpActivity**:
```csharp
public class MyCustomActivity : HttpActivity
{
    public override string Id => "MyCustomActivity";
    public override string Name => "My Custom Activity";
    public override string Description => "Description of what this activity does";
    
    public override IDictionary<string, ActivityParameterDefinition> InputParameters => 
        new Dictionary<string, ActivityParameterDefinition>
        {
            ["parameterName"] = new ActivityParameterDefinition
            {
                Name = "Parameter Display Name",
                Description = "Parameter description",
                DataType = typeof(string),
                IsRequired = true,
                DefaultValue = "default value"
            }
        };
    
    public override async Task<ActivityResult> ExecuteAsync(ActivityContext context, CancellationToken cancellationToken)
    {
        // Implementation
    }
}
```

2. **Automatic Discovery**: The activity will be automatically discovered and available in the workflow designer

3. **Categorization**: Activities are automatically categorized based on namespace patterns:
   - `FileService` → "File Operations"
   - `TestData` → "Test Data"
   - `Http` → "HTTP Operations"
   - etc.

## Best Practices

### Activity Design
- Use descriptive IDs, names, and descriptions
- Define comprehensive parameter metadata
- Include validation rules for parameters
- Set appropriate default values
- Use meaningful categories and tags

### Performance Considerations
- Activity discovery uses caching to minimize reflection overhead
- Consider the cost of temporary instance creation during discovery
- Use the refresh endpoint sparingly in production

### Error Handling
- Activities should handle exceptions gracefully
- Use structured logging for debugging
- Provide meaningful error messages

### UI Integration
- Define appropriate icons and colors for visual distinction
- Use categories to organize related activities
- Provide helpful examples and validation messages

## Example Usage

### Frontend Workflow Designer

Users can now:
1. Open the workflow designer at `/workflow-designer`
2. Browse available activities in the dynamic toolbox
3. Search for specific activities using the search box
4. Filter activities by category
5. Drag and drop activities onto the canvas
6. Configure activity parameters based on discovered metadata
7. Execute workflows with the discovered activities

### API Integration

```csharp
// Get all available activities
var activities = await workflowServiceClient.GetAllActivitiesAsync();

// Search for specific activities
var testDataActivities = await workflowServiceClient.SearchActivitiesAsync("test data");

// Get activities in a specific category
var fileActivities = await workflowServiceClient.GetActivitiesByCategoryAsync("File Operations");
```

## Benefits

1. **Extensibility**: New activities are automatically discovered without code changes
2. **Maintainability**: Centralized metadata management
3. **User Experience**: Rich, searchable activity toolbox
4. **Developer Experience**: Simple activity creation process
5. **Performance**: Efficient caching and lazy loading
6. **Flexibility**: Support for diverse activity types and parameters

## Future Enhancements

- Activity versioning and compatibility checking
- Custom attribute-based metadata configuration
- Activity marketplace integration
- Advanced validation rule engine
- Visual activity designer for custom activities
- Activity templates and wizards
- Dependency management between activities
- Activity performance metrics and monitoring

## Troubleshooting

### Common Issues

1. **Activities not appearing**: Check that the assembly is loaded and the activity implements `IActivity`
2. **Metadata missing**: Ensure the activity can be instantiated with available dependencies
3. **Cache issues**: Use the refresh endpoint to clear and reload the cache
4. **Performance issues**: Monitor reflection overhead and consider assembly filtering

### Debugging

- Enable debug logging for the `ActivityDiscoveryService`
- Use the `/api/v1/activities/refresh` endpoint to force cache refresh
- Check the browser console for frontend discovery errors
- Verify activity constructor dependencies are registered

## Conclusion

The Activity Discovery Service provides a robust foundation for building extensible workflow systems. By automatically discovering and cataloging available activities, it enables rich user experiences while maintaining developer productivity and system maintainability.