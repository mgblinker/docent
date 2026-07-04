---
type: feature
---

# Social Care Bookings Domain (Initial Scheduling Calendar)

This folder contains the initial implementation for the Social Care Bookings scheduling calendar.

## Components

`booking-schedule-calendar.component.ts` – Standalone component that displays the shared calendar with a left sidebar listing _open_ booking requests for a given team.

## Services

`booking-requests.service.ts` – Thin wrapper around `SocialCareClient.getTeamBookingRequests` providing a simplified observable of booking request list items.

## Assumptions

- **API Version**: Hard‑coded to `1` in the wrapper service. If backend versioning changes, expose via configuration.
- **Team Id Source**: Currently passed via the `teamId` input of the calendar component. In future, derive from authenticated context or a selector UI.
- **Open Requests Filter**: The API endpoint currently returns team booking requests. If a dedicated status filter for "open" is later required, extend the service with an optional status parameter.
- **Events Mapping**: Booking requests are not yet converted into calendar events. When business rules for placement and duration are clarified, enrich `calendarEvents` accordingly.

## Next Steps (Potential Enhancements)

1. Add status filtering (e.g. only `Pending` / `Open`).
2. Map booking requests into visual calendar events with color coding by priority.
3. Add detail drawer when clicking a booking request including recommended carers.
4. Implement pagination / infinite scroll in sidebar if volume grows.
5. Introduce caching and refresh mechanics (polling or websocket updates).

---

Initial scaffold created automatically; adjust as domain evolves.
