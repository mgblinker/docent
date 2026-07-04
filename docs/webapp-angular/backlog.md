# Backlog — Processity.WebApp.Angular
Last updated: 2026-05-07

## Known Issues
- (issue description, severity)

## Technical Debt
- (debt items)

## Planned Improvements
- (future enhancements)

## PL-003a - Financial Overview Widget (Portfolio Manager Dashboard)

Extracted from PL-003. Requires new backend — do not implement until backend is ready.

### Requirements

- Per-project budget tracking: total allocated budget, planned spend, actual spend (cash-out focus)
- Dashboard widget: 3 large KPI badges — Total Budget, Planned Spend, Actual Spend — colour-coded (green = under, amber = within 10% of limit, red = over)
- Drill-down: click any badge to open a budget detail panel per project

### Backend needed

- New `Budget` entity on `Project` (totalBudget, currency)
- `SpendEntry` entity (date, amount, description, projectId)
- Endpoints: `GET /portfolio/financial-summary` returning totals per project + rolled-up figures
- Integration with Billing service considered in future (phase 2)

---

## PL-003b - Capacity Overview Widget (Portfolio Manager Dashboard)

Extracted from PL-003. Requires integration with staff-management service — do not implement until integration is defined.

### Requirements

- Workforce totals grouped by planning role (Portfolio Manager, Project Manager, Dev Team Member, People Manager)
- Utilization rate per team member: issues in-progress story points / capacity (configurable hours/week)
- Dashboard widget: role breakdown chips with headcount, utilization bars, avatar stacks for over-utilised members (> 80%)

### Backend needed

- New endpoint or aggregation: `GET /portfolio/capacity-summary` crossing planning users with staff-management availability data
- Capacity baseline (hours/week) per user — configurable in settings

---

## PL-003c - Planning Event Calendar / Next Meeting Widget (Portfolio Manager Dashboard)

Extracted from PL-003.

### Requirements

- "Next planning event" prominent card shown on dashboard on load (sprint review, retro, planning meeting, portfolio review)
- Card shows: meeting title, date/time, attendee avatars (avatar service), countdown ("in 3 days")
- Clicking the card opens the meeting detail with: meeting notes (rich text), and an embedded view (Roadmap for PortfolioReview/SprintReview, Backlog for SprintPlanning)

### Backend changes needed (Communication service)

- Extend `Meeting` entity with `MeetingType` enum: `General`, `SprintReview`, `Retrospective`, `SprintPlanning`, `PortfolioReview`
- New endpoint: `GET /meetings/next-planning-event` — returns the next future meeting where `MeetingType != General`, scoped to tenant

---

## PL-003 - Role-Specific Dashboards - Portfolio Manager

Set up Portfolio Manager dashboard according to the actual needs and requirements of the persona / role:

- Financial Overview (overall buget, planned budget, actual spend) - focus on cash-out
- Capacity overview: Workforce overall, by role, utilization
- Project Roadmap including progress bars for running projects, warning indicators for projects running late, having risks or running over budget
- Project Backlog
- Event calendar (especially next planning events)
- Look up next event when loading the dashboard, show the event (clickable, showing details, ability to take meeting notes, embed the relevant view - backlog or roadmap - when opening the dashboard)

### Non-functional requirements

- Use existing functionality wherever existant - the planning app is part of the platform we're building as a whole. We want as few duplication as possible, hence integration with other services we've already built (event management, communication, activities etc.) is mandatory
- Mind the UI appearance. Use colors, icons, large badges, avatars (also use the avatar service). Graphical elements over texts
- extract large-effort work items into separate backlog items - only prepare the requirements, do not yet implement in this case

## SG-001 - Full-Edit Signature Generator

### Template Gallery layout

- Template gallery always visible (right sidebar, collapsable, initially extended)
- On select show menu => use template

### Editor component

- Add toolbox in left sidebar, listing fields of StaffMember entity (use Model Discovery service)
- Make editor fully functional:
    - Placing & repositioning of text fields (show alignment assistance)
    - Font family, size and styling
    - Allow for adding images
    - Email and url fields: format as anchor fields directly
- Store positioning and styling of elements in backend

### NFRs

- Make use of Form Editor services and components where it makes sense, try to duplicate as little as possible
