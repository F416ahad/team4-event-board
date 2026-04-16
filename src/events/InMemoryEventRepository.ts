import { randomUUID } from 'crypto'
import type { IEventRepository } from './EventRepository'
import type { Event, CreateEventInput, EventCategory } from './Event'

export class InMemoryEventRepository implements IEventRepository {
  private events: Map<string, Event> = new Map()

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) ?? null
  }

  async findActive(): Promise<Event[]> {
    return [...this.events.values()]
      .filter((e) => e.status === 'active')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  }

  async findPast(category?: EventCategory): Promise<Event[]> {
    return [...this.events.values()]
      .filter((e) => e.status === 'past')
      .filter((e) => (category ? e.category === category : true))
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())
  }

  async save(input: CreateEventInput): Promise<Event> {
    const event: Event = {
      ...input,
      id: randomUUID(),
      status: 'active',
      createdAt: new Date(),
    }
    this.events.set(event.id, event)
    return event
  }

  
  getAll(): Event[] {
  return [...this.events.values()]

  }
  async transitionExpired(): Promise<number> {
    const now = new Date()
    let count = 0
    for (const event of this.events.values()) {
      if (event.status === 'active' && event.endTime <= now) {
        this.events.set(event.id, { ...event, status: 'past' })
        count++
      }
    }
    return count
  }

  seed(events: Omit<Event, 'id' | 'createdAt'>[]): void {
    for (const input of events) {
      const event: Event = {
        ...input,
        id: randomUUID(),
        createdAt: new Date(),
      }
      this.events.set(event.id, event)
    }
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository()
}