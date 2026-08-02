---
type: architecture
---

# Calendar Invitations

> Hand-written feature documentation, not auto-generated. Update manually
> when this feature changes — nothing regenerates this file automatically
> (unlike the per-endpoint docs under `flows/`, which come from
> `tools/generate-docs.mjs`).

## What this feature does

A user edits attendees on a calendar event in an external CalDAV client
(Outlook, macOS Calendar, Thunderbird, eM Client) that's synced against
`Processity.Calendar`. On the next sync (a CalDAV `PUT`), the added/removed
attendees are detected and:

- **Added attendees** receive a real invitation email with an ICS attachment
  (`METHOD:REQUEST`), via Backend's existing Meeting/Invitation
  infrastructure — including CoreData Contact resolution (existing contact
  reused by email; a minimal stub created if none exists) and RSVP support.
- **Removed attendees** receive a cancellation for *just their own
  invitation* (`METHOD:CANCEL`) — the meeting and every other attendee's
  invitation are left untouched.

## Why two systems are involved

This codebase has two unrelated things both called "calendar":

- **`Processity.Calendar`** — the standalone CalDAV microservice. Owns
  `CalendarItem` (the thing that actually syncs to Apple/Outlook/Thunderbird
  via CalDAV app tokens). Before this feature, `CalendarItem` had no
  attendee concept at all — `CalendarService.ParseIcs` silently discarded
  every `ATTENDEE`/`ORGANIZER` line in incoming ICS payloads.
- **`Processity.Backend`'s `Communications` module** — a separate
  `Meeting`/`Invitation` scheduling domain that already had full, working
  invite infrastructure: contact resolution, ICS generation
  (`InvitationIcsService`), attachment email via real SMTP
  (`EmailMessagingService`), and RSVP (`RespondToInvitationCommand`).

These two systems never talked to each other before this feature. Rather
than duplicating Backend's mature invite logic inside the Calendar
microservice, this feature makes `Processity.Calendar` create/maintain a
**"shadow" `Meeting`** in Backend, correlated 1:1 with a `CalendarItem`, and
drives Backend's existing commands to do the actual work.

All Calendar↔Backend integration here is CAP/EventBus only (no synchronous
HTTP exists across that boundary anywhere in this codebase) — this feature
follows that same convention.

## End-to-end flow

```
CalDAV client (Outlook/macOS/Thunderbird)
  │  PUT .../caldav/{ownerId}/{uid}.ics  (ATTENDEE lines added/removed)
  ▼
Processity.Calendar  CalDavController.PutItem
  │  CalendarService.ParseIcs extracts ATTENDEE → ParsedAttendee(Email, DisplayName)
  │  CreateCalendarItemCommandHandler / UpdateCalendarItemCommandHandler
  │    - persists CalendarItemAttendee rows
  │    - diffs prior vs new attendee list (by lowercased email)
  ▼  publishes calendar.item.attendees_changed (CAP, PublishWithAuthAsync)
     { CalendarItemId, Title, StartDate, EndDate, Location, OwnerId, Added[], Removed[] }
  ▼
Processity.Backend  Communications module
  CalendarItemAttendeesChangedEventHandler (Features/CalendarSync/...)
  │  1. Resolves organizer: GetContactByUserIdQuery(UserId) → SetCurrentUserContactId
  │     (Calendar's auth middleware only ever sets UserId, never ContactId)
  │  2. Meeting lookup by ExternalCalendarItemId
  │
  ├─ not found + Added.Count > 0:
  │     find-or-create Contact per added attendee (FindContactByEmailQuery /
  │     CreateContactCommand, name derived from email local-part if no
  │     display name) → CreateMeetingCommand(ExternalCalendarItemId: ...)
  │
  ├─ found:
  │     Added   → find-or-create Contact, dedupe against existing
  │               Invitations by email → SendInvitationsCommand (existing,
  │               unmodified) → InvitationSentEvent → ICS (METHOD:REQUEST)
  │               + attachment email
  │     Removed → match Invitation by email → CancelInvitationCommand (new)
  │               → InvitationCancelledEvent → ICS (METHOD:CANCEL, reuses
  │               GenerateCancellationIcs unchanged) + attachment email to
  │               just that one invitee
```

## Data model changes

**Processity.Calendar**
- `CalendarItemAttendee` (new entity): `CalendarItemId` (FK), `Email`
  (lowercased), `DisplayName?`. Unique index on `{CalendarItemId, Email}`.
- `CalendarItem.Attendees` (new `ICollection<CalendarItemAttendee>`).

**Processity.Backend (Communications)**
- `Meeting.ExternalCalendarItemId` (new, `Guid?`, unique index) — the
  correlation key linking a shadow Meeting back to its CalendarItem. `null`
  for meetings created normally through the Communications UI.

## Event contracts

Two events are involved, following this codebase's established convention
for cross-repo CAP events: **each side independently defines its own local
mirror record** (same event name/topic string, same JSON shape) — there is
no shared compiled assembly between Calendar and Backend. See
`Communications.Models/.../BookingCreatedEvent.cs` for a pre-existing
example of this same pattern.

- **`calendar.item.attendees_changed`** — published by Calendar
  (`Calendar.Models/CalendarItems/Events/CalendarItemAttendeesChangedEvent.cs`),
  mirrored in Backend
  (`Communications.Models/Interactions/Events/CalendarItemAttendeesChangedEvent.cs`).
  Carries `CalendarItemId` as a **plain `Guid`**, not Calendar's
  `CalendarItemId` typed-id wrapper — a typed id would serialize as a nested
  `{"Value": "..."}` object over the wire and break deserialization on the
  Backend side, which has no knowledge of that type.
- **`invitation.cancelled`** — new event, Backend-only (no cross-repo
  mirror needed since nothing outside Communications consumes it yet).
  Published via `PublishWithAuthAsync` (not the bare `PublishAsync` that
  `CancelMeetingCommandHandler` uses for `MeetingCancelledEvent` — that's a
  pre-existing inconsistency elsewhere in this codebase given its subscriber
  expects an authenticated envelope; don't copy it).

## The organizer-resolution fix

`MeetingService.CreateMeetingAsync` resolves the meeting organizer via
`ICurrentUserProvider.GetCurrentUserContactId()`. Calendar's
`CalDavAuthMiddleware` only ever calls `SetCurrentUserId(...)` — it never
sets a `ContactId`, because Calendar has no Contact concept at all. Left
alone, the ambient auth context arriving at Backend via
`PublishWithAuthAsync` would carry `ContactId = Guid.Empty`, silently
breaking organizer resolution.

`CalendarItemAttendeesChangedEventHandler` fixes this itself, before calling
anything organizer-dependent: it resolves the real Contact from the
reliable `UserId` via `GetContactByUserIdQuery`, then calls
`ICurrentUserService.SetCurrentUserContactId(...)` to patch the ambient
context for the rest of the handler's execution. If no Contact exists yet
for that UserId (e.g. a calendar owner who's never triggered Contact
creation), the handler fails loudly with a logged error rather than
creating a Meeting with a broken/empty organizer.

## Contact resolution for attendees

Mirrors the existing `BookingCreatedEventHandler` pattern exactly: attendee
emails are looked up via `FindContactByEmailQuery`; if no match, a minimal
`Contact` is created via `CreateContactCommand` with a name derived from the
display name (split on first space) or the email's local-part if no display
name was supplied by the CalDAV client.

## Reused vs. new

**Reused unchanged**: `SendInvitationsCommand`/Handler, `InvitationIcsService`
(all three ICS generators, including `GenerateCancellationIcs` — it was
already recipient-agnostic, generating one shared CANCEL ics with no
per-attendee ATTENDEE line, so per-invitation cancel needed no ICS-generation
changes at all), `EmailMessagingService`, `FindContactByEmailQuery`/
`CreateContactCommand`, `AuthenticatedEventHandlerBase`'s context-restoration
mechanism.

**New**: `CalendarItemAttendee` entity/config/migration (Calendar),
`Meeting.ExternalCalendarItemId` field/migration (Backend),
`CancelInvitationCommand`/Handler (per-invitation cancel didn't exist before
— only whole-meeting `CancelMeetingCommand` did),
`InvitationCancelledEvent`/`InvitationCancelledNotificationHandler`,
`CalendarItemAttendeesChangedEventHandler`, ATTENDEE parsing in
`CalendarService.ParseIcs`.

**Fixed along the way** (found during the Meeting/Invitation audit that
preceded this feature): `InvitationSentNotificationHandler` had hardcoded
the ICS ORGANIZER field to `"noreply@processity.com"` instead of
`meeting.Organizer?.EmailAddress`, even though `meeting.Organizer` was
already loaded two lines above. First-invitation emails showed the wrong
organizer; update/cancel emails were already correct. Fixed to match.

## RFC 6638 CalDAV Scheduling Extensions (why "Add Person" works in Apple Calendar)

Everything above describes how attendee changes reach Backend once they
arrive via CalDAV — but for a long time Apple Calendar (Mac Mail/Calendar
app) never showed the "Add Person"/Invitees field for this calendar at all,
because `CalDavController` was, and mostly still is, "minimal CalDAV (RFC
4791)": plain storage/sync only. Apple Calendar gates the attendee UI behind
the **CalDAV Scheduling Extensions (RFC 6638)** protocol handshake, which
this codebase added on top of (not instead of) the flow above:

- `Options()` now advertises `calendar-schedule` in the `DAV` header, plus
  `POST` in `Allow`.
- The collection's `PROPFIND` response (`BuildCollectionResponse`) now
  includes `schedule-outbox-URL`, `schedule-inbox-URL`, and
  `calendar-user-address-set` — but **only when the authenticating
  `CalDavAppToken` has a resolved `OwnerEmail`** (see below). Without it,
  these properties are omitted entirely and the calendar degrades safely to
  the old non-scheduling behavior.
- A new `outbox/` route (`ScheduleOutbox`) accepts the iTIP
  `REQUEST`/`CANCEL` POST that Apple Calendar sends once it sees scheduling
  is supported, instead of a blind `PUT`. It deliberately routes into the
  **same** `CreateCalendarItemCommand`/`UpdateCalendarItemCommand` path as
  `PutItem` — this is the one thing that must never be duplicated, since
  that's what triggers `calendar.item.attendees_changed` and, from there,
  the real invitation email via Backend. The outbox is a protocol adapter
  in front of the existing pipeline, not a second delivery mechanism.
- The resourcetype on the collection also gains `<D:principal/>` alongside
  `<D:collection/><C:calendar/>`, but only when scheduling properties are
  present. Per RFC 3744/6638, clients only trust `schedule-outbox-URL`/
  `calendar-user-address-set` found on a resource that self-identifies as a
  principal — without this, Apple Calendar silently ignored those
  properties even though they were present in the PROPFIND body, and never
  showed "Add Person". Found by testing against a real Mac Calendar client
  after the initial implementation looked correct in isolated `curl` checks.
- A stub `inbox/` route exists only to satisfy clients that probe for it —
  it's always empty. Attendees in this system are external email contacts,
  never CalDAV principals on this server, so there's no scenario where
  another CalDAV principal delivers a `REPLY` into it. Attendee responses
  still arrive exclusively through Backend's invitation-link/email RSVP
  flow (unchanged, described above).

### Organizer email (`calendar-user-address-set`)

RFC 6638 needs a real address for the organizer, both so Apple Calendar
recognizes the account as the organizer and so invitee emails show the
correct "From". Calendar service has no email/Contact concept anywhere
else in its domain, so this required a new one-time lookup:

- `CalDavAppToken.OwnerEmail` (nullable) is resolved once, at CalDAV-token
  creation time (`CreateCalDavAppTokenCommandHandler`), via a new
  `CoreDataContactClient` calling Backend's
  `GET /api/core-data/v1.0/contacts/by-user/{userId}`.
- **This is the first synchronous HTTP call across the Calendar↔Backend
  boundary** — everything else in this document is CAP/EventBus-only. It's
  justified here because it's a one-off, user-initiated action (creating a
  token), not a hot path. The call forwards the user's own auth cookie
  (cookie-only auth in this codebase) plus an `X-Tenant-Identifier` header,
  the same pattern `ModuleRoleRegistrationService` uses for its
  Calendar→Authentication calls.
- If no Contact exists yet (or the call fails for any reason),
  `OwnerEmail` stays `null` and token creation still succeeds — scheduling
  is just not advertised for that token. This is the opposite failure mode
  from the organizer-resolution fix earlier in this document (which fails
  loudly): a missing Contact here degrades a nice-to-have UI capability,
  not a load-bearing invite pipeline.

## RFC 6638 debugging notes (things that looked like server bugs but weren't, and one macOS gotcha)

Getting Apple Calendar to actually trust and use the advertised scheduling
support took several rounds against a real Mac, each surfacing a genuine
protocol gap — worth recording so the next person doesn't rediscover these
the hard way:

1. **Principal must self-identify.** The collection's `resourcetype` needs
   `<D:principal/>` alongside `<D:collection/><C:calendar/>` (RFC 3744) —
   without it, clients won't trust `schedule-outbox-URL`/
   `calendar-user-address-set` found there, even though they're present in
   the response.
2. **`principal-URL` (RFC 3744) is not `current-user-principal` (RFC
   5397).** Real macOS discovery (`dataaccessd`/`accountsd`) explicitly
   requests the older `principal-URL` property too. Leaving it out — even
   though the newer property was present — was enough to break trust.
3. **Unsupported requested properties need an explicit 404 propstat
   bucket, not silence.** Real discovery requests ~14 named properties,
   several of them Apple/CalendarServer-specific
   (`dropbox-home-URL`, `notification-URL`, `email-address-set`, ...) that
   this server doesn't support. The original implementation always
   returned the same fixed property bundle regardless of what was asked,
   with no `404` entry for anything else — an incomplete-looking
   multistatus response can make a strict client discard the *whole*
   response, including the scheduling properties it actually got right.
   `CalDavController.PropFind` now parses the requested `<prop>` list and
   splits available vs. unavailable properties into separate `200`/`404`
   propstat blocks (falls back to returning everything when no specific
   list was requested, e.g. a bare `getctag`/`sync-token` sync check).

None of the above were caught by isolated `curl` testing against a
hand-built request — they only showed up by capturing the **exact** request
bodies real macOS `accountsd`/`dataaccessd` processes sent (temporary
request/response logging added to `CalDavAuthMiddleware`, removed once
resolved) and replaying them verbatim. A `curl --data-binary` test without
an explicit `Content-Type: application/xml` header is *not* equivalent —
curl defaults to `application/x-www-form-urlencoded`, which gets the body
silently drained by ASP.NET Core's form pipeline before the controller ever
sees it, making a perfectly correct implementation look broken.

**The actual last blocker was client-side caching, not the server.** CalDAV
principal/scheduling discovery is specified to be a one-time, indefinitely-
cached judgment per RFC 6638. On macOS 26.5.2, removing and re-adding the
account, killing `CalendarAgent`/`dataaccessd`/`accountsd`, and even
deleting `~/Library/Calendars/Calendar Cache` did **not** force a fresh
discovery — captured traffic kept showing only routine sync requests, never
the full discovery sequence again, after the very first one. What did work:
**adding the account with a different username string** (the CalDAV
password/token already changes per attempt; the *username* apparently
factors into account-identity caching at the Accounts-framework level,
separate from the Calendar sync cache). If this bites again, that's the
lever to pull before assuming it's a server regression.

## Known limitations

- **Verified working end-to-end against a real Mac Calendar client**
  (macOS 26.5.2) — the "Add Person" field appears and the account is
  recognized as scheduling-capable. See the debugging notes above for what
  it took to get there.
- **`inbox/` is a permanent stub**, not a temporary gap — see above.
- **No live/manual end-to-end test performed for the base attendee flow
  either.** Everything was verified by reading code and confirming both
  full solutions (`Processity.Calendar`, `Processity.Backend`) build clean,
  including their test projects — not by actually running the flow against
  a real SMTP server or CalDAV client.
- **CalendarItem detail changes (title/time/location) after the shadow
  Meeting exists are not forwarded.** Only attendee additions/removals
  trigger `calendar.item.attendees_changed`; editing an event's time or
  title without touching attendees does not currently update the shadow
  Meeting or send a "meeting updated" ICS to existing invitees.
- **Attendee matching is exact-email-only** (case-insensitive, via
  lowercasing at both the `CalendarItemAttendee` persistence layer and the
  Contact lookup). No fuzzy/alias matching.
- **New-owner edge case** (calendar owner with no CoreData Contact yet) is
  handled by failing loudly rather than degrading gracefully — by design,
  per the plan, but means the very first CalDAV attendee sync for a brand
  new user could visibly fail until their Contact record exists. (Note this
  is distinct from the `OwnerEmail`/scheduling lookup above, which degrades
  gracefully instead — different feature, different failure philosophy.)

## Key files

**Processity.Calendar**
- `Service/src/Calendar.Service/Domain/Entities/CalendarItemAttendee.cs`
- `Service/src/Calendar.Service/Infrastructure/Data/Configurations/CalendarItemAttendeeConfiguration.cs`
- `Service/src/Calendar.Service/Application/Services/CalendarService.cs` (`ParseAttendees`, `ParsedAttendee`)
- `Service/src/Calendar.Service/Features/CalendarItems/{CreateCalendarItem,UpdateCalendarItem}/*CommandHandler.cs`
- `Service/src/Calendar.Service/API/CalDav/CalDavController.cs` (`PutItem`)
- `Service/src/Calendar.Models/CalendarItems/Events/CalendarItemAttendeesChangedEvent.cs`

**Processity.Backend**
- `Communications/src/Communications/Interactions/Domain/Entities/Meeting.cs` (`ExternalCalendarItemId`)
- `Communications/src/Communications/Interactions/Application/Services/MeetingService.cs`
- `Communications/src/Communications/Interactions/Features/CalendarSync/HandleCalendarItemAttendeesChanged/CalendarItemAttendeesChangedEventHandler.cs`
- `Communications/src/Communications/Interactions/Features/Meetings/CancelInvitation/{CancelInvitationCommand,CancelInvitationCommandHandler}.cs`
- `Communications/src/Communications/Interactions/Application/EventHandlers/InvitationCancelledNotificationHandler.cs`
- `Communications/src/Communications.Models/Interactions/Events/{CalendarItemAttendeesChangedEvent,InvitationCancelledEvent}.cs`

**RFC 6638 scheduling addition (Processity.Calendar only, no Backend changes)**
- `Service/src/Calendar.Service/API/CalDav/CalDavController.cs` (`Options`, `PropFind`/`BuildCollectionResponse`, `ScheduleOutbox`, `ScheduleInboxPropFind`/`ScheduleInboxReport`/`ScheduleInboxPost`)
- `Service/src/Calendar.Service/Domain/Entities/CalDavAppToken.cs` (`OwnerEmail`)
- `Service/src/Calendar.Service/Application/Services/CoreDataContactClient.cs`
- `Service/src/Calendar.Service/Features/CalDavTokens/CreateCalDavAppToken/CreateCalDavAppTokenCommandHandler.cs`
- `Service/src/Calendar.Service/Authentication/CalDavAuthMiddleware.cs` (`HttpContextItemKey`)
- `Service/src/Calendar.Service/Application/Services/CalendarService.cs` (`ParsedCalendarItem.Method`)
