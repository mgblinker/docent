---
type: manual
---

# User Manual — Online Booking Calendar

## Overview

Any Processity user can publish a personal booking page that lets external visitors book time directly, without signing in. The page is tenant-branded and shows only the time slots the user has defined.

---

## Part 1 — Setting up your booking page (in the web app)

### Step 1 — Open Booking page settings

Navigate to **Communication → Booking page** in the left sidebar.

If you have never activated a booking page, you will see an empty state with an **Activate booking page** button.

### Step 2 — Activate

Click **Activate booking page**. Processity generates a private, opaque link (a random token) for your page. Your link appears immediately:

```
https://book.processity.ch/a3f7c2…
```

Click the copy icon to put it on your clipboard. Share it anywhere — email signature, website, chat.

### Step 3 — Define bookable slots

A *slot template* tells the booking page when you are available and for how long. Click **New slot** to open the slot form:

| Field | Description |
|---|---|
| **Title** | Shown to the visitor (e.g. *30-minute consultation*) |
| **Duration** | Length of each appointment (15 – 120 min) |
| **Buffer** | Gap added after each booking so back-to-back meetings are impossible |
| **Advance window** | How far ahead visitors can book (e.g. *up to 30 days*) |
| **Available days** | Toggle the weekdays you accept bookings |
| **Window start / end** | The earliest and latest start time on those days |

You can create multiple slot templates (e.g. a 15-minute intro call and a 60-minute workshop). Each is shown as a separate card. Use the pencil icon to edit or the bin icon to delete.

### Step 4 — Manage the link

If you believe the link has been shared too widely, click **Regenerate link**. The old URL stops working immediately and a new token is issued. Existing *confirmed* bookings are unaffected.

---

## Part 2 — What visitors see (the booking app)

When a visitor opens your link they land on a standalone public page, separate from the main application.

### Flow

1. **Branding loads** — the page reads your organisation's name, logo, and primary colour from Settings and applies them automatically. Visitors see a branded, consistent experience without any Processity chrome.

2. **Pick a date** — a month calendar highlights days that have at least one free slot; greyed-out days have none (either outside your window, already fully booked, or you marked yourself absent in staff management).

3. **Pick a time** — after selecting a date, the available time slots for that day are listed. Slots that have already been booked are not shown.

4. **Fill in details** — the visitor enters their first name, last name, and email address, then clicks **Confirm booking**.

5. **Confirmation** — a success screen confirms the booking. A confirmation email is sent automatically to the visitor's address using the *booking-confirmation* email template.

---

## Part 3 — What happens in the background

| Event | Result |
|---|---|
| Visitor confirms booking | A *Booking* record is created in the Calendar service |
| `booking.created` published | Communications creates an Appointment and sends the confirmation email |
| Staff member adds an absence (in Staff Management) | The absence syncs to the Calendar service as a blocked entry; those dates become unavailable in the booking calendar |
| Staff member sets an availability override (day off) | Same — the override syncs and blocks the affected date |

---

## Part 4 — Tenant branding (for admins)

The booking page picks up three settings from **Settings → Organisation settings**:

| Key | Effect |
|---|---|
| `branding.name` | Shown as the organisation name above the calendar |
| `branding.logo-url` | Logo displayed in the header |
| `branding.primary-colour` | Overrides the calendar's accent colour (hex, e.g. `#2E7D32`) |

These can be set via the Organisation settings page or the API. If none are set the page renders with the default Processity theme.
