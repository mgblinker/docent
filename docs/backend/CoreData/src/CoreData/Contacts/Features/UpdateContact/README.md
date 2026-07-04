---
type: feature
---

# UpdateContact Feature

## UpdateContact

Updates a contact's details (name, email, phone, birth date, etc.).  
**External** — exposed via `PUT /api/core-data/v1.0/contacts/{id}`, requires authentication.

## UpdateUserContactId

Links a contact record to a user account by setting `UserId` on the contact.  
**Internal only** — no HTTP endpoint; invoked via the CQRS mediator (e.g. after user registration/provisioning).
