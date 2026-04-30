import { PrismaClient } from "@prisma/client";

import type { UserRole } from "../auth/User";

export type EventStatus = "active" | "cancelled";

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
        : events.filter((e) => e.createdByUserId === userId);

    return filtered.map((event) => {
      const attendeeCount = event.rsvps.filter(
        (r) => r.status === "going"
      ).length;

      return {
        id: event.id,
        title: event.title,
        organizerId: event.createdByUserId,
        status: event.status as EventStatus,
        date: event.date ?? null,
        category: null,

        capacity: event.capacity ?? 0,
        attendeeCount,
        attendingRatio: `${attendeeCount} / ${event.capacity ?? "unlimited"}`,

      };
    });
  }

  /**
   * Sprint 2 requirement: grouping by status
   * Used for dashboard UI sections
   */
  groupByStatus(events: DashboardEventDTO[]) {
    return {
      active: events.filter((e) => e.status === "active"),
      cancelled: events.filter((e) => e.status === "cancelled"),
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
      (r) => r.status === "going"
    ).length;

    return {
      id: event.id,
      title: event.title,
      date: event.date ?? null,
      category: null,

      status: event.status as EventStatus,

      capacity: event.capacity ?? 0,
      attendeeCount,

      attendingRatio: `${attendeeCount} / ${event.capacity ?? "unlimited"}`,

      organizerId: event.createdByUserId,
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

  if (role === "staff" && event.createdByUserId !== userId) {
    throw new Error("Forbidden");
  }

}}