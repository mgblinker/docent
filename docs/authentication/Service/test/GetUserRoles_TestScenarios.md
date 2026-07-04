---
type: howto
---

# Test Scenarios for GetUserRoles - Tenant and Global Roles Integration

## Overview

This document outlines test scenarios to verify that the GetUserRoles functionality correctly retrieves and merges roles from both tenant-scoped and global role tables.

## Test Cases

### 1. GetUserRolesQueryHandler Tests (Tenant-Scoped)

#### Test 1.1: User with Only Tenant Roles

**Purpose**: Verify that a user with only tenant-scoped roles receives those roles correctly.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Tenant Roles: `["TenantAdmin", "TenantUser"]`
- Global Roles: `[]`

**Expected Result**:

- Success: `true`
- Roles Returned: `["TenantAdmin", "TenantUser"]`

#### Test 1.2: User with Only Global Roles

**Purpose**: Verify that a user with only global roles receives those roles correctly.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Tenant Roles: `[]`
- Global Roles: `["GlobalAdmin", "GlobalUser"]`

**Expected Result**:

- Success: `true`
- Roles Returned: `["GlobalAdmin", "GlobalUser"]`

#### Test 1.3: User with Both Tenant and Global Roles

**Purpose**: Verify that a user receives both tenant-scoped and global roles merged together.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Tenant Roles: `["TenantAdmin", "TenantUser"]`
- Global Roles: `["GlobalAdmin", "GlobalUser"]`

**Expected Result**:

- Success: `true`
- Roles Returned: `["TenantAdmin", "TenantUser", "GlobalAdmin", "GlobalUser"]`

#### Test 1.4: User with Duplicate Roles (Tenant and Global)

**Purpose**: Verify that duplicate role names are deduplicated.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Tenant Roles: `["Admin", "User"]`
- Global Roles: `["Admin", "SuperUser"]`

**Expected Result**:

- Success: `true`
- Roles Returned: `["Admin", "User", "SuperUser"]` (3 distinct roles)

#### Test 1.5: User with No Roles

**Purpose**: Verify that a user with no roles in either table receives an empty list.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Tenant Roles: `[]`
- Global Roles: `[]`

**Expected Result**:

- Success: `true`
- Roles Returned: `[]`

#### Test 1.6: Global Roles Query Fails

**Purpose**: Verify that tenant roles are still returned even if global roles query fails.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Tenant Roles: `["TenantAdmin", "TenantUser"]`
- Global Roles Query: `Failed`

**Expected Result**:

- Success: `true`
- Roles Returned: `["TenantAdmin", "TenantUser"]`

#### Test 1.7: Exception Handling

**Purpose**: Verify graceful error handling when repository throws exception.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Repository throws: `Exception("Database connection failed")`

**Expected Result**:

- Success: `false`
- Error Message: Contains "Failed to retrieve user roles"

### 2. Global GetUserRolesQueryHandler Tests

#### Test 2.1: User with Global Roles

**Purpose**: Verify retrieval of global roles from AspNetRoles table.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Global Roles in AspNetRoles: `["GlobalAdmin", "GlobalUser", "GlobalViewer"]`

**Expected Result**:

- Success: `true`
- Roles Returned: `["GlobalAdmin", "GlobalUser", "GlobalViewer"]`

#### Test 2.2: User with No Global Roles

**Purpose**: Verify empty list returned when user has no global roles.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Global Roles in AspNetRoles: `[]`

**Expected Result**:

- Success: `true`
- Roles Returned: `[]`

#### Test 2.3: Repository Exception

**Purpose**: Verify error handling when repository fails.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- Repository throws: `Exception("Database connection failed")`

**Expected Result**:

- Success: `false`
- Error Message: Contains "Failed to retrieve global user roles"

### 3. GlobalUserRepository Integration Tests

#### Test 3.1: Retrieve Roles from AspNetUserRoles and AspNetRoles

**Purpose**: Verify correct JOIN operation between AspNetUserRoles and AspNetRoles tables.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- AspNetRoles Table:
  - Role 1: `Id=guid1, Name="GlobalAdmin"`
  - Role 2: `Id=guid2, Name="GlobalUser"`
- AspNetUserRoles Table:
  - `UserId=12345678-1234-1234-1234-123456789012, RoleId=guid1`
  - `UserId=12345678-1234-1234-1234-123456789012, RoleId=guid2`

**Expected Result**:

- Roles Returned: `["GlobalAdmin", "GlobalUser"]`

#### Test 3.2: Filter by User ID

**Purpose**: Verify that only roles for the specified user are returned.

**Setup**:

- User 1 ID: `12345678-1234-1234-1234-123456789012`
- User 2 ID: `87654321-4321-4321-4321-210987654321`
- AspNetUserRoles Table:
  - `UserId=12345678-1234-1234-1234-123456789012, RoleId=guid1` (GlobalAdmin)
  - `UserId=87654321-4321-4321-4321-210987654321, RoleId=guid2` (GlobalViewer)

**Expected Result** for User 1:

- Roles Returned: `["GlobalAdmin"]`

#### Test 3.3: Handle Null Role Names

**Purpose**: Verify that roles with null names are filtered out.

**Setup**:

- User ID: `12345678-1234-1234-1234-123456789012`
- AspNetRoles Table:
  - Role 1: `Id=guid1, Name="GlobalAdmin"`
  - Role 2: `Id=guid2, Name=null`
- AspNetUserRoles for both roles

**Expected Result**:

- Roles Returned: `["GlobalAdmin"]` (null name filtered out)

### 4. End-to-End Integration Tests

#### Test 4.1: Full Flow - User with Both Role Types

**Purpose**: Verify complete flow from API endpoint to database.

**Test Steps**:

1. Create global user in AspNetUsers table
2. Assign global role "GlobalAdmin" in AspNetUserRoles
3. Create tenant user in TenantUsers table
4. Assign tenant role "TenantAdmin" in TenantUserRoles
5. Call GET `/api/v1.0/auth/roles/users/{userId}`

**Expected API Response**:

```json
{
  "value": ["TenantAdmin", "GlobalAdmin"],
  "isSuccess": true,
  "errors": []
}
```

#### Test 4.2: Mediator Pattern Verification

**Purpose**: Verify that TenantScoped handler correctly calls Global handler via mediator.

**Verification Points**:

- Mediator.Send is called with GlobalGetUserRolesQuery
- GlobalGetUserRolesQuery.UserId matches request UserId
- Results from both handlers are merged

## Manual Testing Checklist

### Setup Database State

1. **Global Roles Setup** (AspNetRoles table):

   ```sql
   INSERT INTO global.AspNetRoles (Id, Name, NormalizedName)
   VALUES
     ('guid-1', 'GlobalAdmin', 'GLOBALADMIN'),
     ('guid-2', 'GlobalUser', 'GLOBALUSER');
   ```

2. **Global User-Role Assignment** (AspNetUserRoles table):

   ```sql
   INSERT INTO global.AspNetUserRoles (UserId, RoleId)
   VALUES
     ('test-user-guid', 'guid-1');
   ```

3. **Tenant Roles Setup** (TenantRoles table):

   ```sql
   INSERT INTO tenant1.TenantRoles (Id, Name, NormalizedName)
   VALUES
     ('guid-3', 'TenantAdmin', 'TENANTADMIN'),
     ('guid-4', 'TenantUser', 'TENANTUSER');
   ```

4. **Tenant User-Role Assignment** (TenantUserRoles table):
   ```sql
   INSERT INTO tenant1.TenantUserRoles (UserId, RoleId)
   VALUES
     ('test-user-guid', 'guid-3');
   ```

### API Testing

1. **Test User with Both Roles**:

   ```http
   GET /api/v1.0/auth/roles/users/{test-user-guid}
   ```

   Expected: `["TenantAdmin", "GlobalAdmin"]`

2. **Test User with Only Global Role**:
   - Remove tenant role assignment
   - Expected: `["GlobalAdmin"]`

3. **Test User with Only Tenant Role**:
   - Remove global role assignment
   - Expected: `["TenantAdmin"]`

4. **Test User with No Roles**:
   - Remove all role assignments
   - Expected: `[]`

## Performance Considerations

- Test with users having multiple roles (10+) to verify JOIN performance
- Test concurrent requests for different users
- Monitor database query execution plans

## Security Considerations

- Verify that users can only query their own roles (unless admin)
- Test cross-tenant isolation (tenant roles don't leak across tenants)
- Verify global roles are truly global across all tenants
