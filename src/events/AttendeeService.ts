import type { IEventRepository } from './EventRepository'
import type { UserRole } from '../auth/User'
import { Ok, Err, type Result } from '../lib/result'

export type RsvpStatus = 'attending' | 'waitlisted' | 'cancelled'

export interface Rsvp {
  id: string
  eventId: string
  userId: string
  displayName: string
  status: RsvpStatus
  createdAt: Date
}

export interface GroupedAttendees {
  attending: Rsvp[]
  waitlisted: Rsvp[]
  cancelled: Rsvp[]
}

export type AttendeeError =
  | { name: 'NotFound'; message: string }
  | { name: 'Forbidden'; message: string }
  | { name: 'AttendeeError'; message: string }

export interface IRsvpRepository {
  findByEvent(eventId: string): Promise<Rsvp[]>
}

export interface IAttendeeService {
  getAttendeesForEvent(
    eventId: string,
    requesterId: string,
    requesterRole: UserRole
  ): Promise<Result<GroupedAttendees, AttendeeError>>
}

class AttendeeService implements IAttendeeService {
  constructor(
    private readonly rsvpRepo: IRsvpRepository,
    private readonly eventRepo: IEventRepository
  ) {}

  async getAttendeesForEvent(
    eventId: string,
    requesterId: string,
    requesterRole: UserRole
  ): Promise<Result<GroupedAttendees, AttendeeError>> {
    const event = await this.eventRepo.findById(eventId)
    if (!event) {
      return Err({ name: 'NotFound' as const, message: 'Event not found.' })
    }

    const isOrganizer = event.organizerId === requesterId
    const isAdmin = requesterRole === 'admin'

    if (!isOrganizer && !isAdmin) {
      return Err({
        name: 'Forbidden' as const,
        message: 'Only the event organizer or an admin can view the attendee list.',
      })
    }

    try {
      const rsvps = await this.rsvpRepo.findByEvent(eventId)
      const sorted = rsvps.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      return Ok({
        attending: sorted.filter((r) => r.status === 'attending'),
        waitlisted: sorted.filter((r) => r.status === 'waitlisted'),
        cancelled: sorted.filter((r) => r.status === 'cancelled'),
      })
    } catch {
      return Err({ name: 'AttendeeError' as const, message: 'Failed to retrieve attendees.' })
    }
  }
}

export function CreateAttendeeService(
  rsvpRepo: IRsvpRepository,
  eventRepo: IEventRepository
): IAttendeeService {
  return new AttendeeService(rsvpRepo, eventRepo)
}