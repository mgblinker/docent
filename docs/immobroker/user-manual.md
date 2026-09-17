---
type: howto
audience: public
---

# ImmoBroker — User Manual for Real-Estate Brokers

Welcome to ImmoBroker! This guide helps you manage your property listings, leads, viewings, and documents from one central platform. Whether you're listing a single apartment or managing a portfolio of 100+ properties, ImmoBroker streamlines the entire workflow.

---

## Getting started

### Login

1. Navigate to **https://immobroker.processity.ch**
2. Click **Login**
3. Enter your work email and password (provided by your office manager)
4. Complete the OIDC login flow (single sign-on with your Processity account)
5. You'll land on your **Dashboard**

### Dashboard

The dashboard shows your:

- **Active listings** (count, status breakdown)
- **New leads this week** (inbox overview)
- **Upcoming viewings** (next 7 days)
- **Document checklist progress** (avg % complete across all objects)
- **Quick actions** (Create Object, View Inbox, Check Viewings)

---

## Phase 1: Objects & Leads (Currently Available)

### Feature F1: Create and manage real-estate listings

A listing (called an "Object" in ImmoBroker) is your property record. Each listing appears in the system with details like address, type, asking price, and photos.

#### Create a new listing

1. Click **Objects** in the main navigation
2. Click **+ Create Object** (or the card on dashboard)
3. Fill in the form:
   - **Address** (street, postal code, city, canton)
   - **Type**: Wohnung, Haus, MFH, Gewerbe, or Grundstück
   - **Asking price** (CHF)
   - **Living area** (m²)
   - **Plot area** (m², if applicable)
   - **Room count**
   - **Year built**
   - **Headline** (e.g., "Modern 3.5-room apartment in Altstetten")
   - **Description** (selling points, features)
   - **Seller contact** (select from your contacts)
   - **Status** (Draft = not yet listed)
4. Click **Save**
5. System auto-generates a unique **Slug** (e.g., `moderne-3-5-zimmer-altstetten`)—this is used for the public intake form

#### View your listings

1. Click **Objects**
2. You'll see a table of all your listings with:
   - Address
   - Status (Draft, Active, Reserved, Sold, Archived)
   - Asking price
   - Created date
   - Number of leads

**Filters:**

- By **Status**: Show only Active, Sold, Archived, etc.
- By **Type**: Filter by apartment, house, etc.
- By **Text**: Search by address or headline

#### Edit a listing

1. Click an object row to open **Detail view**
2. Click the **Edit** button in the header
3. Modify fields and click **Save**

#### Archive a listing

1. Open a listing detail
2. Click **Archive** (status changes to "Archived")
3. Archived listings are hidden from normal views but preserved for records

#### What happens next (F2): The intake form

Once you activate a listing (status = Active), a **public URL is generated**:

```
https://immobroker.processity.ch/inquire/{slug}
```

You can:

- Share this link on your website
- Include it in property portals (Homegate, ImmoScout24)
- Post it on social media
- Share via email with contacts

Interested buyers fill out a short form (name, email, message) → creates a **Lead** → arrives in your Inbox.

---

### Feature F2: Receive inquiries (Public Lead Intake)

**Coming soon.** The public intake form will let buyers inquire about your properties without requiring a login or phone call.

---

## Phase 1 (Future): Lead qualification & viewings (F3–F5)

### Feature F3: Qualify leads (Manual scoring)

When you receive a lead, you'll see it in your **Inbox** per object. You'll be able to:

1. Review their inquiry message
2. Open a **Qualification panel** with fields:
   - Purchase intent (serious, just-looking, needs-financing)
   - Timeframe (next 3 months, 3–6 months, 6–12 months, flexible)
   - Budget range (CHF min–max)
   - Equity available (CHF or %)
3. Score them: **Hot** (very qualified) / **Warm** (qualified) / **Cold** (unqualified) / **Rejected**
4. If you reject: system sends a templated rejection email automatically

**Note:** All qualification is visible in the lead's thread for your office team.

### Feature F4: Viewing slot self-booking

Once you've marked a lead as Hot or Warm, you can:

1. Open the **Object detail**
2. Define **available slots** (e.g., Saturday 10:00–12:00, 14:00–16:00)
3. The lead receives a magic link
4. They pick a slot from a calendar
5. Viewing is auto-booked, added to your calendar, and confirmed via email

No more phone tag!

### Feature F5: Viewing reminders & feedback

After a viewing is booked:

- Lead receives **reminders** at 48h, 24h, and 2h before
- Post-viewing, they get a **feedback form**
- You see aggregate feedback on the **Object detail → Feedback tab**
- Feedback can be shared with the seller

---

## Phase 2: Documents, Inbox & Reports (F6–F9)

### Feature F6: Document hub & checklists

Coming soon. You'll be able to:

- See a **required documents checklist** per object type (e.g., Grundbuchauszug, GEAK, Kaufvertrag)
- Upload documents directly
- Track status (Missing / Uploaded / Sent to parties / Signed)
- View version history

### Feature F7: Unified inbox

Coming soon. Per object, you'll see **one unified thread** with:

- All lead inquiries
- Viewing confirmations & feedback
- Email & SMS history
- Internal notes from your team

### Feature F8: Email & SMS templates

Coming soon. Create reusable templates with merge fields like `{ContactName}`, `{ViewingTime}`, `{ObjectAddress}`. Use them for rejections, confirmations, reminders, and custom outreach.

### Feature F9: Weekly seller reports

Coming soon. Every Monday, your sellers get an **automated summary email** with:

- Inquiries received
- Viewings scheduled / completed
- Feedback themes & sentiment
- Next recommended actions

---

## Phase 3: AI, integrations & advanced features (F10–F15)

### Feature F10: AI lead scoring

Coming soon. Instead of manual qualification, the system will auto-score leads as **Red** (poor fit) / **Yellow** (possible) / **Green** (excellent fit) based on:

- Their questionnaire answers
- Budget vs. asking price
- Equity & financing ability
- Timeframe

You'll see the top Green leads first in your inbox.

### Feature F11: Swiss registry integrations

Coming soon. When you list a property:

- System auto-fetches **Grundbuchauszug** (land registry)
- Fetches **GEAK** (energy certification)
- Retrieves **cantonal zoning** info
- All documents land in your Document Hub automatically

Document checklist goes from "Manual" to "Auto-populated" in hours, not weeks.

### Feature F12: Hypothekar pre-check

Coming soon. When a lead submits their budget/equity/income:

- System queries **UBS, ZKB, Raiffeisen** financing APIs
- Gets a financing likelihood score
- Filters out leads who can't afford your property

Your inbox auto-filters: only "bankable" leads shown first.

### Feature F13: AI contract drafts

Coming soon. Click **"Draft Kaufvertrag"** on an object:

- System generates a per-canton, per-object-type contract draft
- You review & edit in a rich text editor
- Export as PDF
- Share with parties for review

From blank page to draft contract in seconds.

### Feature F14: QES e-signature

Coming soon. Once parties agree on a contract:

1. Click **"Send for signature"**
2. Parties receive a signing link (legally-binding per Swiss law)
3. System tracks signature status
4. Signed PDF auto-lands in Document Hub

No courier, no printing, no delays.

### Feature F15: Portal sync (Homegate, ImmoScout24)

Coming soon. Dual-sync your listings:

- Create object in ImmoBroker → auto-lists on Homegate & ImmoScout24
- Inquiries from portals → auto-create Leads in ImmoBroker
- Single source of truth (ImmoBroker is primary; portals are caches)
- De-list on portals when object is sold/reserved

---

## Tips & best practices

### Object organization

1. **Use descriptive headlines** — "Modern 3.5-room apartment with city view" vs. "Apartment"
2. **Complete all fields** — The more info you provide, the better leads you'll get
3. **Set the right status** — Keep things in "Draft" until you're ready to list publicly
4. **Organize by area** — Use text search (e.g., "Zurich-Wiedikon") to keep your list scannable

### Lead management

1. **Respond quickly** — Leads expect a response within 24 hours
2. **Qualify early** — Mark leads Hot/Warm/Cold as soon as you review the inquiry
3. **Use templates** — Once you get template library (F8), create standard rejection/confirmation templates
4. **Share with your team** — Add internal notes to leads so your colleagues can follow up

### Viewings

1. **Define clear time windows** — Multiple slots per day reduce scheduling conflicts
2. **Confirm in advance** — Send reminders 48h and 24h before
3. **Collect feedback** — Post-viewing feedback helps you track market interest
4. **Manage no-shows** — Reschedule and follow up; no-shows often indicate cooling interest

### Document management

1. **Keep documents current** — Update Grundbuchauszug & GEAK when they're about to expire
2. **Organize by checklist** — Use the required-docs checklist to stay compliant per object type
3. **Share selectively** — Mark documents as "Shared with Lead" only when sending offers

### Reporting

1. **Review feedback** — Your sellers will see feedback; respond to any concerns
2. **Track trends** — If inquiry volume is low, revisit your headline/description
3. **Update pricing** — Use the weekly report to spot market signals (high/low inquiry rates)

---

## Accessibility & shortcuts

### Keyboard shortcuts

| Shortcut | Action            |
| -------- | ----------------- |
| `C`      | Create new object |
| `L`      | Go to Leads inbox |
| `V`      | Go to Viewings    |
| `?`      | Show this help    |

### Screen reader support

ImmoBroker is fully accessible (WCAG 2.1 AA):

- All form fields have labels
- Navigation is keyboard-accessible
- Tables have proper header associations
- Images have alt text
- Color is never the only means of conveying info

### Troubleshooting

**Can't login?**

- Check your email address (should match your Processity account)
- Reset password via the login page
- Contact your office manager if you're a new user

**Object isn't appearing in the list?**

- Make sure you're not filtering by Status (show "All" or "Draft")
- Refresh the page (Cmd+R on Mac, Ctrl+R on Windows)
- Check your browser's browser cache

**Lead from portal never arrived?**

- Portal sync is a future feature (F15); for now, manually add leads
- Check the Inbox tab to see if it's there but unread

**Can't edit a past viewing?**

- Once a viewing is marked "Completed" or "NoShow", you can only view the history
- To reschedule, cancel the existing viewing and create a new slot

**Need help?**

- Email support@processity.ch
- Check the FAQ at help.processity.ch
- Your office manager can also help with account/role issues

---

## Frequently asked questions

### Q: Who can see my listings?

**A:**

- Within your office: all Brokers, Office Managers, and People Managers can see your objects
- Public inquiries: anyone with the public link (e.g., your website) can view and inquire
- Sellers: sellers will see feedback & viewing status (future feature)
- Other offices: listings are completely private per tenant

### Q: Can I delete an object?

**A:** No, but you can **Archive** it. This keeps a permanent record (helpful for tax & legal) while hiding it from your active list.

### Q: How do I manage multiple properties?

**A:** Create each as a separate Object. Use filters & text search to keep them organized. In a future version, we'll add bulk operations (edit multiple at once, batch export).

### Q: Can I invite a co-broker to co-list a property?

**A:** Not yet. Currently, one broker per object. A future feature will allow team co-listing with shared lead management.

### Q: Is there a mobile app?

**A:** Not yet. The web app is mobile-responsive; use it on your phone/tablet in a browser. A native app is planned for Phase 3.

### Q: How secure is my data?

**A:**

- All data is encrypted in transit (HTTPS) and at rest (PostgreSQL encryption)
- Multi-tenant isolation: your office's data is completely separate from other offices
- Regular backups (automatic daily)
- Access logs: all user actions are audited

### Q: What happens to my data if I cancel my subscription?

**A:** Your data is kept for 30 days after cancellation. After 30 days, it's permanently deleted. Export your important data before canceling if needed.

### Q: Can I export my objects & leads?

**A:** Coming soon. In Phase 2, we'll add CSV export of objects, leads, and viewings.

### Q: Do you integrate with my CRM or accounting software?

**A:** Future integrations (Phase 3) will include popular tools. For now, use the CSV export to move data between systems.

### Q: How much does it cost?

**A:** Pricing is per-tenant (office). Ask your office manager for subscription details.

---

## Glossary

| Term               | Definition                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Object**         | A property listing (apartment, house, commercial space, etc.)                                                       |
| **Lead**           | A potential buyer or renter who inquired about an Object                                                            |
| **Viewing**        | A scheduled tour of an Object by a Lead                                                                             |
| **Slug**           | A unique, URL-safe identifier for an Object (e.g., `moderne-3-5-zimmer-altstetten`) used in the public inquiry form |
| **Status**         | Object state: Draft (not yet listed), Active (publicly available), Reserved (under offer), Sold, Archived           |
| **Qualification**  | Assessment of a Lead's seriousness: Hot (very likely to buy), Warm (maybe), Cold (unlikely), Rejected               |
| **Checklist**      | Per-object-type list of required documents (Grundbuchauszug, GEAK, etc.)                                            |
| **Thread**         | Unified conversation history (inquiries, viewings, emails, notes) per Object×Contact                                |
| **Template**       | Reusable email or SMS text with merge fields (e.g., `{ContactName}`, `{ViewingTime}`)                               |
| **Seller**         | The owner of the property you're listing                                                                            |
| **Broker**         | You—the real-estate professional managing properties and leads                                                      |
| **Office Manager** | Administrative user who manages team, roles, and settings                                                           |

---

## Feedback & feature requests

ImmoBroker is built for you. We want your feedback!

- **Report a bug:** support@processity.ch (describe the issue + screenshot)
- **Request a feature:** Fill out the feedback form in the app (**Settings → Feedback**)
- **Join beta testing:** Opt-in to test Phase 2 features early

---

## Getting help

| Topic                     | Resource                                              |
| ------------------------- | ----------------------------------------------------- |
| How do I...?              | See **Tips & best practices** above                   |
| Something isn't working   | Check **Troubleshooting** section                     |
| I forgot my password      | Go to login page → Reset password                     |
| I need account setup help | Contact your office manager                           |
| Urgent issue              | Email support@processity.ch (response within 2 hours) |

---

**Last updated:** June 27, 2026  
**Version:** 1.0 (Phase 1 user manual)  
**Next update:** With Phase 2 feature rollout
