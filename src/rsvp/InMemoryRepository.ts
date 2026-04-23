import { Ok, Err, type Result } from "../lib/result";
 
export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "PAST";
export type RSVPStatus = "ATTENDING" | "WAITLISTED" | "CANCELLED";
 
export interface InMemoryRSVP {
  id: string;
  eventId: string;
  memberId: string;
  status: RSVPStatus;
  waitlistPosition: number | null;
  createdAt: Date;
}
 
export interface InMemoryEvent {
  id: string;
  title: string;
  date: Date;
  category: string;
  capacity: number;
  organizerId: string;
  status: EventStatus;
  createdAt: Date;
}
 
export interface EventWithCounts extends InMemoryEvent {
  attendingCount: number;
}
 
export interface EventWithRsvps extends InMemoryEvent {
  rsvps: (InMemoryRSVP & { member: { displayName: string } })[];
}
 
type DomainError = { name: string; message: string };
 
export interface IEventRepository {
  getEventsForOrganizer(
    organizerId: string,
    role: "admin" | "staff" | "user"
  ): Promise<Result<Record<string, EventWithCounts[]>, DomainError>>;
 
  getEventWithRsvps(
    eventId: string
  ): Promise<Result<EventWithRsvps | null, DomainError>>;
 
  publishEvent(
    eventId: string,
    organizerId: string,
    role: "admin" | "staff" | "user"
  ): Promise<Result<void, DomainError>>;
 
  cancelEvent(
    eventId: string,
    organizerId: string,
    role: "admin" | "staff" | "user"
  ): Promise<Result<void, DomainError>>;
 
  cancelRsvpAndPromote(
    eventId: string,
    memberId: string
  ): Promise<Result<void, DomainError>>;
}
 
export class InMemoryEventRepository implements IEventRepository {
  private events: InMemoryEvent[] = [];
  private rsvps: InMemoryRSVP[] = [];
  private members: { id: string; displayName: string }[] = [];
 
  // ── Seed helpers ──────────────────────────────────────────────────
 
  seedEvent(event: InMemoryEvent): void {
    this.events.push(event);
  }
 
  seedRsvp(rsvp: InMemoryRSVP): void {
    this.rsvps.push(rsvp);
  }
 
  seedMember(member: { id: string; displayName: string }): void {
    this.members.push(member);
  }
 
  reset(): void {
    this.events = [];
    this.rsvps = [];
    this.members = [];
  }
 
  // ── IEventRepository ──────────────────────────────────────────────
 
  async getEventsForOrganizer(
    organizerId: string,
    role: "admin" | "staff" | "user"
  ): Promise<Result<Record<string, EventWithCounts[]>, DomainError>> {
    if (role === "user") {
      return Err({ name: "UnauthorizedError", message: "Members cannot access the dashboard." });
    }
 
    const filtered = role === "admin"
      ? this.events
      : this.events.filter((e) => e.organizerId === organizerId);
 
    const withCounts: EventWithCounts[] = filtered.map((e) => ({
      ...e,
      attendingCount: this.rsvps.filter(
        (r) => r.eventId === e.id && r.status === "ATTENDING"
      ).length,
    }));
 
    const groups: Record<string, EventWithCounts[]> = {
      PUBLISHED: [],
      DRAFT: [],
      CANCELLED: [],
      PAST: [],
    };
 
    for (const e of withCounts) {
      groups[e.status]?.push(e);
    }
 
    return Ok(groups);
  }
 
  async getEventWithRsvps(
    eventId: string
  ): Promise<Result<EventWithRsvps | null, DomainError>> {
    const event = this.events.find((e) => e.id === eventId) ?? null;
    if (!event) return Ok(null);
 
    const rsvps = this.rsvps
      .filter((r) => r.eventId === eventId && r.status !== "CANCELLED")
      .map((r) => ({
        ...r,
        member: {
          displayName:
            this.members.find((m) => m.id === r.memberId)?.displayName ?? "Unknown",
        },
      }));
 
    return Ok({ ...event, rsvps });
  }
 
  async publishEvent(
    eventId: string,
    organizerId: string,
    role: "admin" | "staff" | "user"
  ): Promise<Result<void, DomainError>> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return Err({ name: "EventNotFoundError", message: "Event not found." });
    if (role !== "admin" && event.organizerId !== organizerId) {
      return Err({ name: "UnauthorizedError", message: "You do not own this event." });
    }
    event.status = "PUBLISHED";
    return Ok(undefined);
  }
 
  async cancelEvent(
    eventId: string,
    organizerId: string,
    role: "admin" | "staff" | "user"
  ): Promise<Result<void, DomainError>> {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return Err({ name: "EventNotFoundError", message: "Event not found." });
    if (role !== "admin" && event.organizerId !== organizerId) {
      return Err({ name: "UnauthorizedError", message: "You do not own this event." });
    }
    event.status = "CANCELLED";
    return Ok(undefined);
  }
 
  async cancelRsvpAndPromote(
    eventId: string,
    memberId: string
  ): Promise<Result<void, DomainError>> {
    const rsvp = this.rsvps.find(
      (r) => r.eventId === eventId && r.memberId === memberId
    );
    if (!rsvp) return Err({ name: "RsvpNotFoundError", message: "RSVP not found." });
    if (rsvp.status === "CANCELLED") return Ok(undefined);
 
    const wasAttending = rsvp.status === "ATTENDING";
    rsvp.status = "CANCELLED";
    rsvp.waitlistPosition = null;
 
    if (!wasAttending) return Ok(undefined);
 
    // Promote next waitlisted member (FIFO)
    const waitlisted = this.rsvps
      .filter((r) => r.eventId === eventId && r.status === "WAITLISTED")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
 
    if (waitlisted.length === 0) return Ok(undefined);
 
    const promoted = waitlisted[0];
    promoted.status = "ATTENDING";
    promoted.waitlistPosition = null;
 
    // Recompute remaining waitlist positions
    const remaining = waitlisted.slice(1);
    remaining.forEach((r, i) => {
      r.waitlistPosition = i + 1;
    });
 
    return Ok(undefined);
  }
}
 
export function CreateInMemoryEventRepository(): InMemoryEventRepository {
  return new InMemoryEventRepository();
}