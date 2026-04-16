# Service Contracts

This file defines the interface contracts for every shared service method in the project.
Do not change a method's signature, return shape, or error names without updating this file
and notifying all teammates who depend on it. Breaking a contract after a teammate has built
against it is an Integration Compromise (−10 pts per sprint).

---

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
