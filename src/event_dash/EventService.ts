import { PrismaClient } from "@prisma/client";
import type { UserRole } from "../auth/User";
import type { EventCategory } from "../events/Event";
import { coerceCategory } from "../events/Event";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus = "active" | "cancelled" | "past";

export interface DashboardEventDTO {
  id: string;
  title: string;
  // Field name matches the canonical Event type so views can be shared.
  date: Date;
  endTime: Date | null;
  category: EventCategory;

  status: EventStatus;

  capacity: number | null;
  attendeeCount: number;
  attendingRatio: string;

  // Field name matches the canonical Event type.
  createdByUserId: string;
  organizerName: string | null;
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
   * - admin → every event
   * - staff → only events they created
   * - user  → only events they created (so users can see what they're on)
   *
   * Note: the route already gates `/dashboard` to authenticated users, and
   * the dashboard view shows publish/cancel actions only for the organizer
   * or admin.
   */
  async getDashboard(userId: string, role: UserRole): Promise<DashboardEventDTO[]> {
    const events = await this.prisma.event.findMany({
      select: {
        id: true,
        title: true,
        date: true,
        endTime: true,
        status: true,
        capacity: true,
        category: true,
        createdByUserId: true,
        rsvps: { select: { status: true } },
        createdBy: { select: { displayName: true } },
      },
      orderBy: { date: "asc" },
    });

    const filtered =
      role === "admin"
        ? events
        : events.filter((e) => e.createdByUserId === userId);

    return filtered.map((event) => this.toDTO(event));
  }

  /**
   * Group DTOs into active / past / cancelled.
   */
  groupByStatus(events: DashboardEventDTO[]): GroupedEvents {
    return {
      active: events.filter((e) => e.status === "active"),
      past: events.filter((e) => e.status === "past"),
      cancelled: events.filter((e) => e.status === "cancelled"),
    };
  }

  /**
   * Load a single event for HTMX row refresh.
   */
  async getEventForDashboard(eventId: string): Promise<DashboardEventDTO | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        date: true,
        endTime: true,
        status: true,
        capacity: true,
        category: true,
        createdByUserId: true,
        rsvps: { select: { status: true } },
        createdBy: { select: { displayName: true } },
      },
    });

    if (!event) return null;
    return this.toDTO(event);
  }

  /**
   * Update event status (active/cancelled).
   */
  async updateEventStatus(
    eventId: string,
    userId: string,
    role: UserRole,
    newStatus: "active" | "cancelled"
  ): Promise<void> {
    if (role === "user") {
      throw new Error("Forbidden");
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        createdByUserId: true,
        status: true,
      },
    });

    if (!event) {
      throw new Error("Event not found");
    }

    if (role === "staff" && event.createdByUserId !== userId) {
      throw new Error("Forbidden");
    }

    if (event.status === "past") {
      throw new Error("Cannot change the status of a past event");
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: { set: newStatus },
      },
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private toDTO(event: {
    id: string;
    title: string;
    date: Date | null;
    endTime?: Date | null;
    status: string;
    capacity: number | null;
    category?: string | null;
    createdByUserId: string;
    createdBy?: { displayName: string } | null;
    rsvps: { status: string }[];
  }): DashboardEventDTO {
    const attendeeCount = event.rsvps.filter((r) => r.status === "going").length;

    return {
      id: event.id,
      title: event.title,
      date: event.date ?? new Date(0),
      endTime: event.endTime ?? null,
      category: coerceCategory(event.category),
      status: event.status as EventStatus,
      capacity: event.capacity ?? null,
      attendeeCount,
      attendingRatio: `${attendeeCount} / ${event.capacity ?? "unlimited"}`,
      createdByUserId: event.createdByUserId,
      organizerName: event.createdBy?.displayName ?? null,
    };
  }
}
