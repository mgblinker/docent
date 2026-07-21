---
type: flows
---

# Delete Product

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ProductController.DeleteProduct
- **Endpoints**:
  - `DELETE /sales/v{version:apiVersion}/products/{id:guid}` (via ApiGateway; internally `api/sales/v{version:apiVersion}/products/{id:guid}`)
- **Module**: Backend/ProductData
- **Modules touched by this flow**: Backend/ProductData, Backend/SocialCare

```mermaid
flowchart TB
  EP_ProductControllerDeleteProduct[["ProductController.DeleteProduct<br/>(DELETE)"]]
  MOD_Backend_ProductData["Backend/ProductData"]
  REQ_DeleteProductCommand("Delete Product")
  EP_ProductControllerDeleteProduct -->|| REQ_DeleteProductCommand
  REQ_DeleteProductCommand -->|DeleteProductCommandHandler| MOD_Backend_ProductData
  EVT_product_catalog_product_deleted{{"Product Deleted"}}
  MOD_Backend_ProductData -->|DeleteProductCommandHandler| EVT_product_catalog_product_deleted
  MOD_Backend_SocialCare["Backend/SocialCare"]
  EVT_product_catalog_product_deleted -->|ProductDeletedEventHandler| MOD_Backend_SocialCare
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Module Assignment Requested](#/flows/AutomationService/module-assignment-requested)
- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Create Product](#/flows/Backend/ProductData/create-product)
- [Update Product](#/flows/Backend/ProductData/update-product)
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
