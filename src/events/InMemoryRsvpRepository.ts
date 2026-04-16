import { randomUUID } from 'crypto'
import type { IRsvpRepository, Rsvp, RsvpStatus } from './AttendeeService'

export class InMemoryRsvpRepository implements IRsvpRepository {
  private rsvps: Map<string, Rsvp> = new Map()

  async findByEvent(eventId: string): Promise<Rsvp[]> {
    return [...this.rsvps.values()].filter((r) => r.eventId === eventId)
  }

  seed(rsvps: Omit<Rsvp, 'id' | 'createdAt'>[]): void {
    for (const input of rsvps) {
      const rsvp: Rsvp = {
        ...input,
        id: randomUUID(),
        createdAt: new Date(),
      }
      this.rsvps.set(rsvp.id, rsvp)
    }
  }
}

export function CreateInMemoryRsvpRepository(): InMemoryRsvpRepository {
  return new InMemoryRsvpRepository()
}