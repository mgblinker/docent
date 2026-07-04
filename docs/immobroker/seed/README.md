---
type: howto
---

# Registry Integration Seed Data

These JSON files define TargetSystem + OperationMapping + MappingRule configurations for the IntegrationService and MappingService. They demonstrate the full Grundbuch and GEAK integration pipeline.

## Setup Steps

### 1. Create Mappings in MappingService

For each seed file, POST the `mapping` object to create the mapping:

```bash
# Grundbuch mapping
curl -X POST http://localhost:8084/api/mappings/v1.0 \
  -H "Content-Type: application/json" \
  -H "Cookie: processity-auth=<your-token>" \
  -d @- <<'EOF'
{
  "mappingName": "grundbuch-response-to-immobroker",
  "description": "Transforms Grundbuch API response into ImmoBroker enrichment fields",
  "defaultOutputType": "json",
  "mappingRules": [...]
}
EOF

# Note the returned mapping GUID
```

Repeat for the GEAK mapping.

### 2. Create TargetSystems in IntegrationService

```bash
# Grundbuch target system
curl -X POST http://localhost:8085/api/file-service/v1.0/configuration \
  -H "Content-Type: application/json" \
  -H "Cookie: processity-auth=<your-token>" \
  -d @- <<'EOF'
{
  "identifier": "swiss-grundbuch",
  "name": "Schweizerisches Grundbuch",
  ...
}
EOF

# Note the returned TargetSystem ID
```

### 3. Create Operations (link to MappingService)

```bash
curl -X POST http://localhost:8085/api/file-service/v1.0/configuration/<targetSystemId>/operations \
  -H "Content-Type: application/json" \
  -H "Cookie: processity-auth=<your-token>" \
  -d @- <<'EOF'
{
  "operationName": "query-by-address",
  "targetEndpoint": "/api/v1/properties/search",
  "httpMethod": "POST",
  "headers": "{\"Accept\":\"application/json\"}",
  "mappingId": "<grundbuch-mapping-guid>",
  "isActive": true
}
EOF
```

### 4. Test the Pipeline

```bash
# Call ImmoBroker's enrich endpoint
curl -X POST http://localhost:20103/api/immobroker/v1.0/objects/<objectId>/enrich \
  -H "Content-Type: application/json" \
  -H "Cookie: processity-auth=<your-token>" \
  -d '{"fetchGrundbuch": true, "fetchGeak": true}'
```

## Mock Endpoints

The TargetSystem configs point to `mock-grundbuch.processity.localdev` and `mock-geak.processity.localdev`. For local testing, either:

1. Add these to `/etc/hosts` pointing to a mock server
2. Use a tool like WireMock to simulate the registry APIs
3. Replace the BaseUrl with a real registry API when credentials are available

## Sample Responses

Each seed file includes a `sampleResponse` field showing the expected format from the registry API. Use this to configure mock server responses.
