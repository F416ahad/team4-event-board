import { randomUUID } from "crypto"
import type { IEventRepository } from "./EventRepository"
import type { Event, CreateEventInput, EventCategory } from "./Event"

export class InMemoryEventRepository implements IEventRepository {
  private events: Map<string, Event> = new Map()

  async findById(id: string): Promise<Event | null> {
    return this.events.get(id) ?? null
  }

  async findActive(): Promise<Event[]> {
    return [...this.events.values()]
      .filter((e) => e.status === "active")
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  async findPast(category?: EventCategory): Promise<Event[]> {
    return [...this.events.values()]
      .filter((e) => e.status === "past")
      .filter((e) => (category ? e.category === category : true))
      .sort((a, b) => {
        const aT = (a.endTime ?? a.date).getTime()
        const bT = (b.endTime ?? b.date).getTime()
        return bT - aT
      })
  }

  async save(input: CreateEventInput): Promise<Event> {
    const event: Event = {
      id: randomUUID(),
      title: input.title,
      capacity: input.capacity ?? null,
      status: "active",
      date: input.date,
      endTime: input.endTime ?? null,
      category: input.category ?? "other",
      createdByUserId: input.createdByUserId,
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
      const cutoff = event.endTime ?? event.date
      if (event.status === "active" && cutoff <= now) {
        this.events.set(event.id, { ...event, status: "past" })
        count++
      }
    }
    return count
  }

  /**
   * Test helper. Accepts events with all canonical fields; falls back to defaults
   * for `id`, `category`, `endTime`, and `createdAt` when omitted.
   */
  seed(
    events: (Partial<Pick<Event, "id" | "createdAt" | "endTime" | "category">> &
      Omit<Event, "id" | "createdAt" | "endTime" | "category">)[]
  ): void {
    for (const input of events) {
      const event: Event = {
        ...input,
        id: input.id && input.id !== "" ? input.id : randomUUID(),
        category: input.category ?? "other",
        endTime: input.endTime ?? null,
        createdAt: input.createdAt ?? new Date(),
      }
      this.events.set(event.id, event)
    }
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository()
}
