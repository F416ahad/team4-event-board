import type { Event, EventCategory, RSVPStatus, RSVP } from "./rsvp"
import type { Result } from "../lib/result"

export interface CreateEventFields {
  title: string
  createdByUserId: string
  capacity?: number | null
  category?: EventCategory
  date?: Date
  endTime?: Date | null
  creator?: { email: string; displayName: string; role: "admin" | "staff" | "user" }
}

export interface UpdateEventFields {
  title: string
  capacity?: number | null
  date: Date
  endTime?: Date | null
  category?: EventCategory
  status: Event["status"]
}

export interface RSVPRepository {
  // Event methods
  createEvent(input: CreateEventFields): Promise<Result<Event, Error>>
  getEvent(id: string): Promise<Result<Event | null, Error>>
  getEvents(): Promise<Result<Event[], Error>>
  updateEvent(eventId: string, updates: UpdateEventFields): Promise<Result<Event | null, Error>>

  // RSVP methods
  addRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<void, Error>>
  getRSVP(eventId: string, userId: string): Promise<Result<RSVP | null, Error>>
  countGoing(eventId: string): Promise<Result<number, Error>>

  // Earliest waitlisted RSVP for an event (for promotion).
  getNextWaitlisted(eventId: string): Promise<Result<RSVP | null, Error>>

  // Update an existing RSVP's status.
  updateRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<RSVP, Error>>
}
