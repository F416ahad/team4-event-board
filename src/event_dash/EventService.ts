import { PrismaClient } from "@prisma/client";
import type { UserRole } from "../auth/User";

// ─── Types ────────────────────────────────────────────────────────────────────

// Status is a plain String field in your schema (not a Prisma enum).
// We cast to this union on read; Prisma gives us `string` at the type level.
export type EventStatus = "active" | "cancelled" | "past";

export interface DashboardEventDTO {
  id: string;
  title: string;
  date: Date | null;
  endTime: Date | null;
  category: string | null;

  status: EventStatus;

  capacity: number | null;      // null = unlimited
  attendeeCount: number;
  attendingRatio: string;       // e.g. "3 / 10" or "3 / unlimited"

  organizerId: string;
  organizerName: string | null; // populated in admin view
}

export interface GroupedEvents {
  active: DashboardEventDTO[];
  past: DashboardEventDTO[];
  cancelled: DashboardEventDTO[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Load all dashboard events for the given user.
   * - admin → every event across all organizers
   * - staff → only events they created
   * - user  → forbidden
   */
  async getDashboard(userId: string, role: UserRole): Promise<DashboardEventDTO[]> {
    if (role === "user") {
      throw new Error("Forbidden");
    }

    const events = await this.prisma.event.findMany({
      select: {
        id: true,
        title: true,
        date: true,
        endTime: true,
        status: true,
        capacity: true,
        userId: true,                     // ← your FK field name
        user: { select: { name: true } }, // ← your relation name
        rsvps: { select: { status: true } }, // ← your relation name
      },
    });

    const filtered =
      role === "admin"
        ? events
        : events.filter((e) => e.user === userId); // ← your FK field name

    return filtered.map((event) => this.toDTO(event));
  }

  /**
   * Group a flat list of DTOs into the three dashboard sections.
   * "past" arrives from the database — your system sets it (e.g. via
   * a cron job) when the event date passes; it is never set by callers.
   */
  groupByStatus(events: DashboardEventDTO[]): GroupedEvents {
    return {
      active:    events.filter((e) => e.status === "active"),
      past:      events.filter((e) => e.status === "past"),
      cancelled: events.filter((e) => e.status === "cancelled"),
    };
  }

  /**
   * Load a single event as a DTO — called after a status update so
   * the controller can re-render just the changed row (HTMX swap).
   */
  async getEventForDashboard(eventId: string): Promise<DashboardEventDTO | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { // ← your relation name
        id: true,
        title: true,
        date: true,
        endTime: true,
        status: true,
        capacity: true,
        userId: true,
        user: { select: { name: true } }, // ← your relation name
        rsvps: { select: { status: true } }, // ← your relation name
      },
    });

    if (!event) return null;
    return this.toDTO(event);
  }

  /**
   * Update an event's status after verifying ownership / role.
   * Callers may only set "active" or "cancelled" from the dashboard.
   * "past" is managed by the system, not by this method.
   */
  async updateEventStatus(
    eventId: string,
    userId: string,
    role: UserRole,
    newStatus: "active" | "cancelled"   // "past" intentionally excluded
  ): Promise<void> {
    if (role === "user") {
      throw new Error("Forbidden");
    }

    const event = await this.prisma.event.findUnique({
      where:  { id: eventId },
      select: { id: true, userId: true, status: true }, // ← your FK field name
    });

    if (!event) {
      throw new Error("Event not found");
    }

    // Staff can only modify events they own
    if (role === "staff" && event.userId !== userId) { // ← your FK field name
      throw new Error("Forbidden");
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data:  { status: "CANCELLED" },
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Convert a raw Prisma event (with rsvps + user included) into a DTO.
   * Centralising the mapping here means getDashboard and
   * getEventForDashboard always produce an identical shape.
   */
  private toDTO(
    event: {
      id: string;
      title: string;
      date: Date | null;
      endTime?: Date | null;
      status: string;
      capacity: number | null;
      userId: string;                     // ← your FK field name
      user?: { name: string } | null;     // ← your relation name
      rsvps: { status: string }[];
    }
  ): DashboardEventDTO {
    const attendeeCount = event.rsvps.filter((r) => r.status === "going").length;

    return {
      id:             event.id,
      title:          event.title,
      date:           event.date ?? null,
      endTime:        event.endTime ?? null,
      category:       null,               // wire up when your schema has it
      status:         event.status as EventStatus,
      capacity:       event.capacity ?? null,
      attendeeCount,
      attendingRatio: `${attendeeCount} / ${event.capacity ?? "unlimited"}`,
      organizerId:    event.userId,       // ← your FK field name
      organizerName:  event.user?.name ?? null, // ← your relation name
    };
  }
}