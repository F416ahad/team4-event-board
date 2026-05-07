// Canonical Event type — aligned to the Prisma schema.
// All modules (rsvp, archive, attendee, dashboard, comment) share this shape.

export type EventStatus = "active" | "cancelled" | "past"

export const EVENT_CATEGORIES = [
  "academic",
  "social",
  "sports",
  "arts",
  "tech",
  "other",
] as const
export type EventCategory = (typeof EVENT_CATEGORIES)[number]

export type RSVPStatus = "going" | "waitlisted" | "cancelled"

export interface RSVP {
  id?: string
  userId: string
  eventId?: string
  status: RSVPStatus
}

export interface Event {
  id: string
  title: string
  capacity: number | null
  status: EventStatus
  // Event start time. Named `date` to match the Prisma column.
  date: Date
  // Event end time. Used by the auto-archive job.
  endTime: Date | null
  category: EventCategory
  createdByUserId: string
  createdAt: Date
  updatedAt?: Date
  // Populated only by in-memory test repositories.
  // Prisma-backed code queries RSVPs through the RsvpRepository instead.
  rsvps?: RSVP[]
}

export type CreateEventInput = {
  title: string
  capacity?: number | null
  date: Date
  endTime?: Date | null
  category?: EventCategory
  createdByUserId: string
}

export function isEventCategory(value: unknown): value is EventCategory {
  return (
    typeof value === "string" &&
    (EVENT_CATEGORIES as readonly string[]).includes(value)
  )
}

export function coerceCategory(value: unknown): EventCategory {
  return isEventCategory(value) ? value : "other"
}
