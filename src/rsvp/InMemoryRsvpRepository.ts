import { Err, Ok, type Result } from "../lib/result";
import type { Event, RSVP, RSVPStatus } from "./rsvp";
import type { CreateEventFields, RSVPRepository, UpdateEventFields } from "./RsvpRepository";

class InMemoryRsvpRepository implements RSVPRepository {
  // events store kept here so the in-memory repo doesn't need event.rsvps mutation.
  constructor(private readonly events: Event[]) {}

  async createEvent(input: CreateEventFields): Promise<Result<Event, Error>> {
    try {
      const event: Event = {
        id: Date.now().toString(),
        title: input.title,
        rsvps: [],
        createdByUserId: input.createdByUserId,
        status: "active",
        date: input.date ?? new Date(),
        endTime: input.endTime ?? null,
        capacity: input.capacity ?? null,
        category: input.category ?? "other",
        createdAt: new Date(),
      };

      this.events.push(event);
      return Ok(event);
    } catch {
      return Err(new Error("Unable to create event"));
    }
  }

  async getEvent(id: string): Promise<Result<Event | null, Error>> {
    try {
      const event = this.events.find((e) => e.id === id) ?? null;
      return Ok(event);
    } catch {
      return Err(new Error("Unable to get event"));
    }
  }

  async getEvents(): Promise<Result<Event[], Error>> {
    try {
      return Ok(Array.from(this.events));
    } catch {
      return Err(new Error("Unable to get events"));
    }
  }

  async updateEvent(eventId: string, updates: UpdateEventFields): Promise<Result<Event | null, Error>> {
    try {
      const event = this.events.find((e) => e.id === eventId) ?? null;
      if (!event) return Ok(null);

      event.title = updates.title;
      event.capacity = updates.capacity ?? null;
      event.date = updates.date;
      event.endTime = updates.endTime ?? null;
      event.status = updates.status;
      if (updates.category) event.category = updates.category;

      return Ok(event);
    } catch {
      return Err(new Error("Unable to update event"));
    }
  }

  async addRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<void, Error>> {
    try {
      const event = this.events.find((e) => e.id === eventId);
      if (!event) return Err(new Error("Event not found"));

      if (!event.rsvps) event.rsvps = [];
      const existing = event.rsvps.find((r) => r.userId === userId);

      if (existing) {
        existing.status = status;
      } else {
        event.rsvps.push({ userId, status });
      }

      return Ok(undefined);
    } catch {
      return Err(new Error("Unable to add RSVP"));
    }
  }

  async getRSVP(eventId: string, userId: string): Promise<Result<RSVP | null, Error>> {
    try {
      const event = this.events.find((e) => e.id === eventId);
      if (!event) return Ok(null);
      const rsvp = event.rsvps?.find((r) => r.userId === userId) ?? null;
      return Ok(rsvp);
    } catch {
      return Err(new Error("Unable to get RSVP"));
    }
  }

  async countGoing(eventId: string): Promise<Result<number, Error>> {
    try {
      const event = this.events.find((e) => e.id === eventId);
      if (!event) return Ok(0);
      const count = event.rsvps?.filter((r) => r.status === "going").length ?? 0;
      return Ok(count);
    } catch {
      return Err(new Error("Unable to count RSVPs"));
    }
  }

  async getNextWaitlisted(eventId: string): Promise<Result<RSVP | null, Error>> {
    try {
      const event = this.events.find((e) => e.id === eventId);
      if (!event) return Ok(null);
      const next = event.rsvps?.find((r) => r.status === "waitlisted") ?? null;
      return Ok(next);
    } catch {
      return Err(new Error("Unable to get next waitlisted"));
    }
  }

  async updateRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<RSVP, Error>> {
    try {
      const event = this.events.find((e) => e.id === eventId);
      if (!event) return Err(new Error("Event not found"));
      const rsvp = event.rsvps?.find((r) => r.userId === userId);
      if (!rsvp) return Err(new Error("RSVP not found"));
      rsvp.status = status;
      return Ok(rsvp);
    } catch {
      return Err(new Error("Unable to update RSVP"));
    }
  }
}

export function createInMemoryRsvpRepository(): RSVPRepository {
  return new InMemoryRsvpRepository([]);
}
