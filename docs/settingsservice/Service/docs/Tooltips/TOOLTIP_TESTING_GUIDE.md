---
type: howto
---

# Tooltip System - Testing Guide

## Testing Checklist

### Backend API Testing

#### 1. Create Tooltip (Admin)

```http
POST /api/tooltips
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "tooltipKey": "test.welcome",
  "pageId": "test-page",
  "targetSelector": ".test-element",
  "content": "This is a test tooltip",
  "triggerStrategy": "OnLoad",
  "displayOrder": 0,
  "isActive": true
}
```

**Expected**: 201 Created with tooltip object

#### 2. Get Active Tooltips for Page

```http
GET /api/tooltips/page/test-page
Authorization: Bearer {user_token}
```

**Expected**: 200 OK with array of active, non-dismissed tooltips

#### 3. Dismiss Tooltip

```http
POST /api/tooltips/dismiss/test.welcome
Authorization: Bearer {user_token}
```

**Expected**: 204 No Content

#### 4. Verify Dismissal

```http
GET /api/tooltips/page/test-page
Authorization: Bearer {user_token}
```

**Expected**: 200 OK with empty array (tooltip dismissed)

#### 5. Reset Dismissal

```http
POST /api/tooltips/reset/test.welcome
Authorization: Bearer {user_token}
```

**Expected**: 204 No Content

#### 6. Update Tooltip (Admin)

```http
PUT /api/tooltips/{tooltipId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "tooltipKey": "test.welcome",
  "pageId": "test-page",
  "targetSelector": ".updated-element",
  "content": "Updated tooltip content",
  "triggerStrategy": "OnLoad",
  "displayOrder": 0,
  "isActive": true
}
```

**Expected**: 200 OK with updated tooltip

#### 7. Delete Tooltip (Admin)

```http
DELETE /api/tooltips/{tooltipId}
Authorization: Bearer {admin_token}
```

**Expected**: 204 No Content

#### 8. Get All Tooltips (Admin)

```http
GET /api/tooltips
Authorization: Bearer {admin_token}
```

**Expected**: 200 OK with all tooltips

### Authorization Testing

#### 9. Non-Admin Create Attempt

```http
POST /api/tooltips
Authorization: Bearer {non_admin_token}
Content-Type: application/json

{...}
```

**Expected**: 403 Forbidden

#### 10. Non-Admin Update Attempt

```http
PUT /api/tooltips/{tooltipId}
Authorization: Bearer {non_admin_token}
```

**Expected**: 403 Forbidden

### Role-Based Visibility Testing

#### 11. Create Admin-Only Tooltip

```http
POST /api/tooltips
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "tooltipKey": "admin.feature",
  "pageId": "admin-page",
  "targetSelector": ".admin-panel",
  "content": "Admin only tooltip",
  "allowedRoles": "Admin",
  "triggerStrategy": "OnLoad",
  "displayOrder": 0,
  "isActive": true
}
```

**Expected**: 201 Created

#### 12. Non-Admin User Gets Page Tooltips

```http
GET /api/tooltips/page/admin-page
Authorization: Bearer {non_admin_token}
```

**Expected**: 200 OK with empty array (role filter applied by backend)

#### 13. Admin User Gets Page Tooltips

```http
GET /api/tooltips/page/admin-page
Authorization: Bearer {admin_token}
```

**Expected**: 200 OK with admin-only tooltip

### Multi-Step Tooltip Testing

#### 14. Create Multi-Step Tooltip

```http
POST /api/tooltips
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "tooltipKey": "tour.onboarding",
  "pageId": "dashboard",
  "targetSelector": ".dashboard-header",
  "content": "Welcome to the tour!",
  "triggerStrategy": "FirstVisit",
  "displayOrder": 0,
  "isActive": true,
  "steps": "[{\"order\":1,\"targetSelector\":\".step1\",\"content\":\"Step 1\"},{\"order\":2,\"targetSelector\":\".step2\",\"content\":\"Step 2\"}]"
}
```

**Expected**: 201 Created with steps stored

### Frontend Testing

#### 15. Page Load Tooltip Display

1. Navigate to page with tooltip
2. Tooltip should display automatically if trigger is "OnLoad"
3. Target element should be highlighted
4. Tooltip should be positioned correctly

#### 16. Dismissal Functionality

1. Click dismiss button (X) on tooltip
2. Tooltip should disappear
3. Refresh page
4. Tooltip should NOT appear again (dismissed state persisted)

#### 17. Multi-Step Navigation

1. Display multi-step tooltip
2. Verify step indicator shows "1 / N"
3. Click "Next" button
4. Verify tooltip moves to next target
5. Verify step indicator updates
6. On last step, verify "Finish" button appears
7. Click "Finish" to dismiss

#### 18. Edit Mode Toggle (Admin Only)

1. Login as admin
2. Verify floating edit button (FAB) is visible
3. Click FAB to enter edit mode
4. Verify visual indicators appear
5. Click FAB again to exit edit mode

#### 19. Tooltip Editor Dialog

1. Enter edit mode
2. Click on element to create tooltip
3. Verify editor dialog opens
4. Fill in tooltip configuration
5. Click "Create"
6. Verify tooltip is saved (appears in list)

#### 20. Cache Invalidation

1. Create a tooltip via API
2. Navigate to page (tooltip should load)
3. Update tooltip via API
4. Clear cache or refresh page
5. Verify updated tooltip displays

### Edge Cases

#### 21. Missing Target Element

1. Create tooltip with selector that doesn't exist
2. Navigate to page
3. Check console for warning message
4. Verify no errors thrown

#### 22. Invalid JSON in Steps

1. Create tooltip with malformed JSON in steps field
2. Navigate to page
3. Verify error is caught gracefully
4. Check console for error message

#### 23. Rapid Dismissal

1. Display multiple tooltips
2. Rapidly click dismiss on each
3. Verify all dismissals are saved
4. Refresh page
5. Verify no tooltips appear

#### 24. Concurrent Edit

1. Open editor for tooltip A in tab 1
2. Open editor for same tooltip in tab 2
3. Save in tab 1
4. Save in tab 2
5. Verify last save wins (optimistic concurrency)

### Performance Testing

#### 25. Large Number of Tooltips

1. Create 50+ tooltips for same page
2. Navigate to page
3. Measure load time
4. Verify caching works
5. Subsequent loads should be faster

#### 26. Network Failure

1. Disable network
2. Attempt to load tooltips
3. Verify graceful degradation (no tooltips, no errors)
4. Re-enable network
5. Verify tooltips load on next navigation

### Database Testing

#### 27. Verify Indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tooltipconfigs';
```

**Expected**: Indexes on TooltipKey (unique) and PageId

#### 28. Verify Cascade Behavior

1. Delete a tenant
2. Verify tooltips for that tenant are also deleted (multi-tenancy)

#### 29. Verify Unique Constraints

```sql
-- Should fail (duplicate tooltip key)
INSERT INTO "TooltipConfigs"
("TooltipKey", "PageId", ...)
VALUES ('duplicate.key', 'page', ...);

INSERT INTO "TooltipConfigs"
("TooltipKey", "PageId", ...)
VALUES ('duplicate.key', 'page', ...);
```

**Expected**: Second insert fails with unique constraint violation

### Integration Testing

#### 30. End-to-End Flow

1. Admin creates tooltip via UI
2. Regular user navigates to page
3. Tooltip displays automatically
4. User dismisses tooltip
5. User refreshes page
6. Tooltip does not appear
7. Admin updates tooltip
8. User clears cache
9. Updated tooltip appears (not dismissed)
10. User navigates away and back
11. Tooltip appears again

### Accessibility Testing

#### 31. Keyboard Navigation

1. Display multi-step tooltip
2. Use Tab to navigate between buttons
3. Use Enter/Space to click buttons
4. Verify all controls are accessible

#### 32. Screen Reader

1. Display tooltip
2. Verify screen reader announces tooltip content
3. Verify controls are labeled correctly

### Browser Compatibility

#### 33. Cross-Browser Testing

Test in:

- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

Verify:

- Tooltip positioning
- CSS rendering
- JavaScript functionality
- Animations

### Mobile Testing

#### 34. Responsive Display

1. Open page on mobile device
2. Verify tooltip is readable
3. Verify controls are tappable
4. Verify positioning adapts to screen size

## Automated Test Examples

### Backend Unit Test (Example)

```csharp
[Fact]
public async Task GetActiveTooltipsForPage_ShouldFilterDismissedTooltips()
{
    // Arrange
    var userId = Guid.NewGuid();
    var pageId = "test-page";

    // Create tooltip
    var tooltip = TooltipConfig.Create(
        "test.tooltip",
        pageId,
        ".test",
        "Test content",
        triggerStrategy: "OnLoad"
    );

    // Dismiss tooltip for user
    var dismissal = UserTooltipDismissal.Create(userId, "test.tooltip");

    // Act
    var result = await _handler.Handle(
        new GetActiveTooltipsForPageQuery(pageId),
        CancellationToken.None
    );

    // Assert
    Assert.Empty(result); // Dismissed tooltip should not appear
}
```

### Frontend Unit Test (Example)

```typescript
describe("TooltipConfigService", () => {
  it("should cache tooltips after loading", (done) => {
    const pageId = "test-page";
    const mockTooltips = [
      {
        /* ... */
      },
    ];

    service.getActiveTooltipsForPage(pageId).subscribe((tooltips) => {
      expect(tooltips).toEqual(mockTooltips);

      // Second call should use cache
      service.getActiveTooltipsForPage(pageId).subscribe((cached) => {
        expect(cached).toBe(mockTooltips); // Same reference
        done();
      });
    });
  });
});
```

## Test Data Setup

### SQL Script for Test Data

```sql
-- Insert test tooltips
INSERT INTO "TooltipConfigs"
  ("Id", "TooltipKey", "PageId", "TargetSelector", "Content",
   "TriggerStrategy", "DisplayOrder", "IsActive", "CreatedAt")
VALUES
  (gen_random_uuid(), 'test.welcome', 'test-page', '.header',
   'Welcome!', 'OnLoad', 0, true, NOW()),
  (gen_random_uuid(), 'test.feature', 'test-page', '.feature',
   'Check out this feature', 'FirstVisit', 1, true, NOW());

-- Insert test dismissal
INSERT INTO "UserTooltipDismissals"
  ("Id", "UserId", "TooltipKey", "DismissedAt", "CreatedAt")
VALUES
  (gen_random_uuid(), '{user_id}', 'test.welcome', NOW(), NOW());
```

## Success Criteria

All tests should pass:

- ✅ API endpoints return correct status codes
- ✅ Authorization rules are enforced
- ✅ Tooltips display correctly on frontend
- ✅ Dismissal state persists correctly
- ✅ Multi-step tooltips navigate properly
- ✅ Edit mode works for admins
- ✅ Role-based filtering works
- ✅ Performance is acceptable (<100ms for cached loads)
- ✅ No console errors
- ✅ Database constraints work
- ✅ Cross-browser compatibility verified
