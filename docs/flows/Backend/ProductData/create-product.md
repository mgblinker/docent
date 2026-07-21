---
type: flows
---

# Create Product

**Auto-generated from code — do not hand-edit.** Regenerate with
`tools/generate-docs.mjs` in the docs repo whenever the source repos change.

- **Controller**: ProductController.CreateProduct
- **Endpoints**:
  - `POST /sales/v{version:apiVersion}/products` (via ApiGateway; internally `api/sales/v{version:apiVersion}/products`)
- **Module**: Backend/ProductData
- **Modules touched by this flow**: Backend/ProductData, Backend/SocialCare

```mermaid
flowchart TB
  EP_ProductControllerCreateProduct[["ProductController.CreateProduct<br/>(POST)"]]
  MOD_Backend_ProductData["Backend/ProductData"]
  REQ_CreateProductCommand("Create Product")
  EP_ProductControllerCreateProduct -->|| REQ_CreateProductCommand
  REQ_CreateProductCommand -->|CreateProductCommandHandler| MOD_Backend_ProductData
  EVT_product_catalog_product_added{{"Product Added"}}
  MOD_Backend_ProductData -->|CreateProductCommandHandler| EVT_product_catalog_product_added
  MOD_Backend_SocialCare["Backend/SocialCare"]
  EVT_product_catalog_product_added -->|ProductAddedEventHandler| MOD_Backend_SocialCare
```

## Continues Into

This flow's own trace ends before these, but they pick up from a node it touches:

- [Module Assignment Requested](#/flows/AutomationService/module-assignment-requested)
- [Contact Data Updated](#/flows/Backend/CoreData/contact-data-updated)
- [Delete Product](#/flows/Backend/ProductData/delete-product)
- [Update Product](#/flows/Backend/ProductData/update-product)
- [Create Referrer Employee](#/flows/Backend/SocialCare/create-referrer-employee)
- [Note Creation Triggered](#/flows/Backend/SocialCare/note-creation-triggered)
- [Service Registered](#/flows/SharedKernel/service-registered)
- [Migration Status Check Requested](#/flows/TenantProvisioning/migration-status-check-requested)
- [Produces Response Type](#/flows/TenantProvisioning/produces-response-type)
- [Reprovision Tenant](#/flows/TenantProvisioning/reprovision-tenant)
- [Service Tenant Licenses Sync](#/flows/TenantProvisioning/service-tenant-licenses-sync)
- [Trigger Schema Update](#/flows/TenantProvisioning/trigger-schema-update)
