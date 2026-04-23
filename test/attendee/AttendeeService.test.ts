import { CreateAttendeeService } from '../../src/events/AttendeeService'
import { InMemoryEventRepository } from '../../src/events/InMemoryEventRepository'
import { InMemoryRsvpRepository } from '../../src/events/InMemoryRsvpRepository'
import type { Event } from '../../src/events/Event'
import type { Rsvp } from '../../src/events/AttendeeService'

const NOW = new Date()

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evt-1',
    title: 'Test Event',
    description: 'desc',
    location: 'Room 1',
    category: 'academic',
    organizerId: 'organizer-1',
    startTime: new Date(NOW.getTime() + 1 * 60 * 60 * 1000),
    endTime: new Date(NOW.getTime() + 2 * 60 * 60 * 1000),
    capacity: 50,
    status: 'active',
    createdAt: NOW,
    ...overrides,
  }
}

function makeRsvp(overrides: Partial<Rsvp> = {}): Omit<Rsvp, 'id' | 'createdAt'> & { createdAt?: Date } {
  return {
    eventId: 'evt-1',
    userId: 'user-1',
    displayName: 'Alice',
    status: 'attending',
    ...overrides,
  }
}

describe('AttendeeService', () => {
  let eventRepo: InMemoryEventRepository
  let rsvpRepo: InMemoryRsvpRepository
  let service: ReturnType<typeof CreateAttendeeService>

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository()
    rsvpRepo = new InMemoryRsvpRepository()
    service = CreateAttendeeService(rsvpRepo, eventRepo)
  })

  describe('authorization', () => {
    it('allows the organizer to view the attendee list', async () => {
      eventRepo.seed([makeEvent()])

      const result = await service.getAttendeesForEvent('evt-1', 'organizer-1', 'staff')

      expect(result.ok).toBe(true)
    })

    it('allows an admin to view any event attendee list', async () => {
      eventRepo.seed([makeEvent()])

      const result = await service.getAttendeesForEvent('evt-1', 'someone-else', 'admin')

      expect(result.ok).toBe(true)
    })

    it('denies a regular user who is not the organizer', async () => {
      eventRepo.seed([makeEvent()])

      const result = await service.getAttendeesForEvent('evt-1', 'random-user', 'user')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.value.name).toBe('Forbidden')
    })

    it('denies staff who are not the organizer', async () => {
      eventRepo.seed([makeEvent()])

      const result = await service.getAttendeesForEvent('evt-1', 'other-staff', 'staff')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.value.name).toBe('Forbidden')
    })

    it('returns NotFound for a non-existent event', async () => {
      const result = await service.getAttendeesForEvent('no-such-event', 'organizer-1', 'admin')

      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.value.name).toBe('NotFound')
    })
  })

  describe('grouping and sorting', () => {
    it('groups RSVPs by status correctly', async () => {
      eventRepo.seed([makeEvent()])
      rsvpRepo.seed([
        makeRsvp({ userId: 'user-1', displayName: 'Alice', status: 'attending' }),
        makeRsvp({ userId: 'user-2', displayName: 'Bob', status: 'waitlisted' }),
        makeRsvp({ userId: 'user-3', displayName: 'Carol', status: 'cancelled' }),
      ])

      const result = await service.getAttendeesForEvent('evt-1', 'organizer-1', 'staff')

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.attending).toHaveLength(1)
      expect(result.value.attending[0].displayName).toBe('Alice')
      expect(result.value.waitlisted).toHaveLength(1)
      expect(result.value.waitlisted[0].displayName).toBe('Bob')
      expect(result.value.cancelled).toHaveLength(1)
      expect(result.value.cancelled[0].displayName).toBe('Carol')
    })

    it('sorts each group by createdAt ascending', async () => {
      const t1 = new Date('2025-01-01T09:00:00Z')
      const t2 = new Date('2025-01-01T10:00:00Z')
      const t3 = new Date('2025-01-01T11:00:00Z')

      eventRepo.seed([makeEvent()])
      rsvpRepo.seed([
        { ...makeRsvp({ userId: 'user-3', displayName: 'Carol', status: 'attending' }), createdAt: t3 },
        { ...makeRsvp({ userId: 'user-1', displayName: 'Alice', status: 'attending' }), createdAt: t1 },
        { ...makeRsvp({ userId: 'user-2', displayName: 'Bob', status: 'attending' }), createdAt: t2 },
      ])

      const result = await service.getAttendeesForEvent('evt-1', 'organizer-1', 'staff')

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.attending.map((r) => r.displayName)).toEqual(['Alice', 'Bob', 'Carol'])
    })

    it('returns empty groups when there are no RSVPs', async () => {
      eventRepo.seed([makeEvent()])

      const result = await service.getAttendeesForEvent('evt-1', 'organizer-1', 'staff')

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.value.attending).toHaveLength(0)
      expect(result.value.waitlisted).toHaveLength(0)
      expect(result.value.cancelled).toHaveLength(0)
    })
  })
})