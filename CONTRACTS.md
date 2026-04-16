# Service Contracts

This file defines the interface contracts for every shared service method in the project.
Do not change a method's signature, return shape, or error names without updating this file
and notifying all teammates who depend on it. Breaking a contract after a teammate has built
against it is an Integration Compromise (−10 pts per sprint).

Feature 2 — Event Details
EventService.getEventById(id)

getEventById(id: string): Promise<Result<Event, EventError>>

Parameters:

id — the unique string ID of the event to retrieve.

Success: Ok(event) where event is a single Event object.

Errors:

"NotFound": No event exists with the provided ID.

"EventError": Repository threw an unexpected error.

Event shape:

TypeScript
{
  id: string
  title: string
  description: string
  location: string
  category: EventCategory
  organizerId: string
  startTime: Date
  endTime: Date
  capacity: number
  status: "published" | "draft" | "past"
  createdAt: Date
}
---
Feature 6 — Category and Date Filter 
EventService.getFilteredEvents(filters)

getFilteredEvents(filters: EventFilters): Promise<Result<Event[], EventError>>

Parameters:

filters — an object containing:

category?: EventCategory | "all"

timeframe?: "all-upcoming" | "this-week" | "this-weekend"

Success: Ok(events) where events is an array of Event objects matching the criteria.

Rule: Only events with status === "published" are returned.

Rule: If category is "all" or omitted, do not filter by category.

Errors:

"EventError": Repository threw an unexpected error.

EventFilters shape:

TypeScript
{
  category?: string;
  timeframe?: string;
}

## Feature 11 — Past Event Archive

### `ArchiveService.transitionExpired()`

```ts
transitionExpired(): Promise<number>
```

**Description:** Scans all active events and marks any whose `endTime` has passed as `"past"`.
Called once on server startup and every 60 seconds via `setInterval`.

**Success:** Returns the number of events that were transitioned (0 if none).

**Errors:** None — never rejects. Failures inside the repository are swallowed silently.

---

### `ArchiveService.getArchive(category?)`

```ts
getArchive(category?: EventCategory): Promise<Result<Event[], ArchiveError>>
```

**Parameters:**
- `category` *(optional)* — one of `"academic" | "social" | "sports" | "arts" | "tech" | "other"`. If omitted, all past events are returned.

**Success:** `Ok(events)` where `events` is an array of `Event` objects with `status === "past"`, sorted by `endTime` descending (most recently ended first).

**Errors:**
| Error name | When it occurs |
|---|---|
| `"ArchiveError"` | Repository threw an unexpected error |

**Event shape:**
```ts
{
  id: string
  title: string
  description: string
  location: string
  category: EventCategory
  organizerId: string
  startTime: Date
  endTime: Date
  capacity: number
  status: "past"
  createdAt: Date
}
```

---

## Feature 12 — Attendee List

### `AttendeeService.getAttendeesForEvent(eventId, requesterId, requesterRole)`

```ts
getAttendeesForEvent(
  eventId: string,
  requesterId: string,
  requesterRole: UserRole
): Promise<Result<GroupedAttendees, AttendeeError>>
```

**Parameters:**
- `eventId` — the ID of the event whose attendees are being requested
- `requesterId` — the `userId` of the user making the request (from session)
- `requesterRole` — the role of the requesting user: `"admin" | "staff" | "user"`

**Success:** `Ok(grouped)` where `grouped` is:
```ts
{
  attending:  Rsvp[]   // sorted by createdAt ascending
  waitlisted: Rsvp[]   // sorted by createdAt ascending
  cancelled:  Rsvp[]   // sorted by createdAt ascending
}
```

**Rsvp shape:**
```ts
{
  id: string
  eventId: string
  userId: string
  displayName: string
  status: "attending" | "waitlisted" | "cancelled"
  createdAt: Date
}
```

**Errors:**
| Error name | When it occurs |
|---|---|
| `"NotFound"` | No event exists with the given `eventId` |
| `"Forbidden"` | Requester is not the event organizer and is not an admin |
| `"AttendeeError"` | Repository threw an unexpected error |

**Access rules:**
- `organizerId === requesterId` → allowed
- `requesterRole === "admin"` → allowed
- Any other combination → `Forbidden`

---

## Shared Types

### `Result<T, E>`
```ts
type Result<T, E> = Ok<T> | Err<E>

interface Ok<T>  { ok: true;  value: T }
interface Err<E> { ok: false; value: E }
```
Always check `result.ok` before accessing `result.value`.

### `EventCategory`
```ts
type EventCategory = "academic" | "social" | "sports" | "arts" | "tech" | "other"
```

### `UserRole`
```ts
type UserRole = "admin" | "staff" | "user"
```











## Feature 4 — RSVP Toggle

### `RsvpService.toggleRSVP(eventId, userId)`

```ts
toggleRSVP(eventId: string, userId: string): Promise<Result<void, RsvpError>>
Parameters:

eventId — the unique ID of the event to RSVP for

userId — the ID of the authenticated user toggling their RSVP

Success: Ok(undefined) — the RSVP status has been updated.

Behavior:

If user has no RSVP for the event: creates a new RSVP.

If currentGoingCount < event.capacity → status "going"

Else → status "waitlisted"

If user already has an RSVP with status "going": changes to "cancelled"

If user already has an RSVP with status "cancelled": changes to "going" (capacity rules apply again)

If event status === "cancelled" → rejects with "EventCancelled"

If event date < now → rejects with "EventPast"

Errors:

Error name	When it occurs
"EventNotFound"	No event exists with the given eventId
"EventCancelled"	Event has been cancelled (status = "cancelled")
"EventPast"	Event date is before the current time
"RsvpError"	Repository threw an unexpected error
RsvpService.getEvent(eventId)
ts
getEvent(eventId: string): Promise<Result<Event, RsvpError>>
Parameters:

eventId — the unique ID of the event to retrieve

Success: Ok(event) where event is a single Event object (see shape below).

Errors:

Error name	When it occurs
"EventNotFound"	No event exists with the given eventId
"RsvpError"	Repository threw an unexpected error
RsvpService.listEvents()
ts
listEvents(): Promise<Result<Event[], RsvpError>>
Success: Ok(events) — array of all events (no filtering by status).

Errors:

Error name	When it occurs
"RsvpError"	Repository threw an unexpected error
RsvpService.createEvent(title, capacity, createdByUserId)
ts
createEvent(
  title: string,
  capacity: number | undefined,
  createdByUserId: string
): Promise<Result<Event, RsvpError>>
Parameters:

title — event title (non‑empty)

capacity — optional maximum number of attendees (no limit if omitted)

createdByUserId — ID of the user creating the event (becomes the event owner/organizer)

Success: Ok(event) with the newly created event. The event is created with:

status = "active"

date = current ISO timestamp

rsvps = []

id = unique UUID

Errors:

Error name	When it occurs
"ValidationError"	title is empty or exceeds max length (if any)
"RsvpError"	Repository threw an unexpected error
RsvpService.getEventOwnerId(eventId)
ts
getEventOwnerId(eventId: string): Promise<Result<string | null, RsvpError>>
Parameters:

eventId — the unique ID of the event

Success: Ok(ownerId) where ownerId is the userId of the event creator, or null if the event does not exist.

Errors:

Error name	When it occurs
"RsvpError"	Repository threw an unexpected error
RsvpService.countGoing(eventId)
ts
countGoing(eventId: string): Promise<Result<number, RsvpError>>
Parameters:

eventId — the unique ID of the event

Success: Ok(count) — number of RSVPs with status "going" for that event (0 if event not found).

Errors:

Error name	When it occurs
"RsvpError"	Repository threw an unexpected error
Event shape (RSVP feature)
ts
interface Event {
  id: string;                    // unique identifier (UUID)
  title: string;                 // event title
  rsvps: RSVP[];                // list of user RSVPs
  capacity?: number;             // optional max attendees
  createdByUserId: string;      // event owner/organizer
  status: "active" | "cancelled"; // event state
  date: string;                 // ISO string of event date
}

interface RSVP {
  userId: string;
  status: "going" | "waitlisted" | "cancelled";
}
Feature 13 — Event Comments
CommentService.postComment(eventId, userId, displayName, content)
ts
postComment(
  eventId: string,
  userId: string,
  displayName: string,
  content: string
): Promise<Result<Comment, CommentError>>
Parameters:

eventId — the ID of the event being commented on

userId — the ID of the authenticated user posting the comment

displayName — the user's display name (denormalized for performance)

content — comment text (max 500 characters)

Success: Ok(comment) where comment is the created comment object.

Errors:

Error name	When it occurs
"EventNotFound"	No event exists with the given eventId
"ValidationError"	content is empty or exceeds 500 characters
"CommentError"	Repository threw an unexpected error
CommentService.getCommentsWithPermissions(eventId, currentUserId, eventOwnerId)
ts
getCommentsWithPermissions(
  eventId: string,
  currentUserId: string | undefined,
  eventOwnerId: string | undefined
): Promise<Result<CommentWithPermissions[], CommentError>>
Parameters:

eventId — the ID of the event

currentUserId — ID of the logged‑in user (may be undefined for unauthenticated)

eventOwnerId — ID of the event owner/organizer (used to grant delete permissions)

Success: Ok(comments) — array of comments for the event, each with an extra canDelete boolean.

Comments are sorted chronologically (oldest first).

Errors:

Error name	When it occurs
"CommentError"	Repository threw an unexpected error
canDelete logic:

true if currentUserRole === "admin"

true if currentUserId === eventOwnerId

true if comment.userId === currentUserId

false otherwise

CommentService.deleteComment(commentId, currentUserId, currentUserRole, eventOwnerId)
ts
deleteComment(
  commentId: string,
  currentUserId: string | undefined,
  currentUserRole: string | undefined,
  eventOwnerId: string | undefined
): Promise<Result<void, CommentError>>
Parameters:

commentId — the ID of the comment to delete

currentUserId — ID of the user making the request

currentUserRole — role of the requesting user ("admin", "staff", or "user")

eventOwnerId — ID of the event owner (used for permission check)

Success: Ok(undefined) — the comment has been deleted.

Errors:

Error name	When it occurs
"NotFound"	No comment exists with the given commentId
"Forbidden"	User does not have permission to delete this comment
"CommentError"	Repository threw an unexpected error
Permission rules (same as canDelete above):

Admin → allowed

Event owner → allowed

Comment author → allowed

Anyone else → Forbidden

Comment shapes
ts
interface Comment {
  id: string;           // unique identifier (UUID)
  eventId: string;      // ID of the event this comment belongs to
  userId: string;       // ID of the comment author
  displayName: string;  // author's display name (denormalized)
  content: string;      // comment text (max 500 chars)
  createdAt: Date;      // timestamp when comment was posted
}

interface CommentWithPermissions extends Comment {
  canDelete: boolean;   // whether the current user may delete this comment
}
Shared Types
Result<T, E>
ts
type Result<T, E> = Ok<T> | Err<E>

interface Ok<T>  { ok: true;  value: T }
interface Err<E> { ok: false; value: E }
Always check result.ok before accessing result.value.

UserRole
ts
type UserRole = "admin" | "staff" | "user"
