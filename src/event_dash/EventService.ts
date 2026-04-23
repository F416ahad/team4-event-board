import { PrismaClient } from "@prisma/client";

import type { UserRole } from "../auth/User";

export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "PAST";

export interface DashboardEventDTO {
  id: string;
  title: string;
  date: Date | null;
  category: string | null;

  status: EventStatus;

  capacity: number;
  attendeeCount: number;
  attendingRatio: string; // e.g. "3 / 10"

  organizerId: string;
}

export class DashboardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Main dashboard query (Sprint 2 core requirement)
   */
  async getDashboard(
    userId: string, role: UserRole
  ): Promise<DashboardEventDTO[]> {
    if (role === "user") {
      throw new Error("Forbidden");
    }

    const events = await this.prisma.event.findMany({
      include: {
        rsvps: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Role-based filtering
    const filtered =
      role === "admin"
        ? events
        : events.filter((e) => e.organizerId === userId);

    return filtered.map((event) => {
      const attendeeCount = event.rsvps.filter(
        (r) => r.status === "ATTENDING"
      ).length;

      return {
        id: event.id,
        title: event.title,
        organizerId: event.organizerId,
        status: event.status,
        date: event.date ?? null,
        category: event.category ?? null,

        capacity: event.capacity,
        attendeeCount,
        attendingRatio: `${attendeeCount} / ${event.capacity}`,

      };
    });
  }

  /**
   * Sprint 2 requirement: grouping by status
   * Used for dashboard UI sections
   */
  groupByStatus(events: DashboardEventDTO[]) {
    return {
      published: events.filter((e) => e.status === "PUBLISHED"),
      draft: events.filter((e) => e.status === "DRAFT"),
      cancelled: events.filter((e) => e.status === "CANCELLED"),
      past: events.filter((e) => e.status === "PAST"),
    };
  }

  /**
   * Optional helper: single event view formatting
   * Useful for show page reuse
   */
  async getEventForDashboard(eventId: string): Promise<DashboardEventDTO | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { rsvps: true },
    });

    if (!event) return null;
    const attendeeCount = event.rsvps.filter(
      (r) => r.status === "ATTENDING"
    ).length;

    return {
      id: event.id,
      title: event.title,
      date: event.date ?? null,
      category: event.category ?? null,

      status: event.status as EventStatus,

      capacity: event.capacity,
      attendeeCount,

      attendingRatio: `${attendeeCount} / ${event.capacity}`,

      organizerId: event.organizerId,
    };
  }
  async updateEventStatus(
  eventId: string,
  userId: string,
  role: UserRole,
  newStatus: EventStatus
): Promise<void> {
  const event = await this.prisma.event.findUnique({
    where: { id: eventId },
  });
    if (!event) throw new Error("Event not found");

  if (role === "user") throw new Error("Forbidden");

  if (role === "staff" && event.organizerId !== userId) {
    throw new Error("Forbidden");
  }

}}