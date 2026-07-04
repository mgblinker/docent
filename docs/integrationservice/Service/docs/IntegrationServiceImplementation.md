---
type: feature
---

# Integration Service Implementation

The integration service has been implemented with the following functionality:

## Core Components

### 1. Input Models

- `ExecuteIntegrationRequest`: Contains target system identifier, operation name, and payload
- `ExecuteIntegrationResponse`: Contains success status, response data, and error information

### 2. Core Services

- `IMappingService`: Retrieves mapping configurations from the mapping service
- `IPayloadTransformationService`: Transforms payloads between formats using mapping rules
- `ITargetSystemClient`: Executes operations against target systems

### 3. Logic Flow

1. **Retrieve Mapping**: Gets operation mapping configuration from the mapping service
2. **Transform Payload**: Applies transformation rules to convert internal format to target system format
3. **Execute Operation**: Performs HTTP request to target system with transformed payload
4. **Return Response**: Returns the response from the target system

## API Endpoint

```
POST /api/integration/execute
```

### Request Body Example

```json
{
  "targetSystemIdentifier": "crm-system",
  "operationName": "create-customer",
  "payload": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1-555-0123"
  }
}
```

### Response Example

```json
{
  "success": true,
  "data": {
    "customerId": "12345",
    "status": "created"
  }
}
```

## Configuration

### appsettings.json

```json
{
  "MappingService": {
    "BaseUrl": "http://localhost:5000"
  }
}
```

## Dependency Registration

In your `Program.cs` or startup configuration:

```csharp
// Add integration services
builder.Services.AddIntegrationServices(builder.Configuration);

// Map integration endpoints
app.MapIntegrationEndpoints();
```

## Mapping Service Contract

The integration service expects the mapping service to provide:

```
GET /api/mappings/{targetSystemIdentifier}/{operationName}
```

Response format:

```json
{
  "targetSystemIdentifier": "crm-system",
  "operationName": "create-customer",
  "targetEndpoint": "https://crm-api.example.com/customers",
  "httpMethod": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {token}"
  },
  "payloadMappings": [
    {
      "sourceField": "firstName",
      "targetField": "first_name"
    },
    {
      "sourceField": "lastName",
      "targetField": "last_name"
    },
    {
      "sourceField": "email",
      "targetField": "email_address"
    },
    {
      "sourceField": "phone",
      "targetField": "phone_number",
      "transformationType": "format",
      "transformationConfig": "({0})"
    }
  ]
}
```

## Transformation Types

The payload transformation service supports:

- `string`: Convert to string
- `int`: Convert to integer
- `decimal`: Convert to decimal
- `bool`: Convert to boolean
- `datetime`: Convert to DateTime with optional format
- `format`: Apply string formatting

## Error Handling

The service provides comprehensive error handling:

- Mapping not found (400 Bad Request)
- Transformation errors (500 Internal Server Error)
- Target system communication errors (500 Internal Server Error)
- Comprehensive logging throughout the process

## Next Steps

1. Configure HTTP clients for specific target systems
2. Implement authentication strategies for target systems
3. Add retry policies for resilience
4. Implement response transformation if needed
5. Add validation for input requests
6. Add metrics and monitoring
