import { PrismaClient } from "@prisma/client";

export type Role = "ORGANIZER" | "ADMIN" | "MEMBER";

export class EventService {
  constructor(private prisma: PrismaClient) {}

  // -------------------------
  // DASHBOARD
  // -------------------------
  async getDashboard(userId: string, role: Role) {
    if (role === "MEMBER") {
      throw new Error("Forbidden");
    }

    if (role === "ADMIN") {
      const events = await this.prisma.event.findMany({
        include: {
          rsvps: true,
        },
      });

      return events.map(this.mapEvent);
    }

    // ORGANIZER
    const events = await this.prisma.event.findMany({
      where: { organizerId: userId },
      include: {
        rsvps: true,
      },
    });

    return events.map(this.mapEvent);
  }

  // -------------------------
  // PUBLISH EVENT
  // -------------------------
  async publishEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new Error("Event not found");

    if (event.organizerId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: "PUBLISHED" },
    });
  }

  // -------------------------
  // CANCEL EVENT
  // -------------------------
  async cancelEvent(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) throw new Error("Event not found");

    if (event.organizerId !== userId) {
      throw new Error("Unauthorized");
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED" },
    });
  }

  // -------------------------
  // MAPPING HELPER
  // -------------------------
  private mapEvent(event: any) {
    const attendeeCount =
      event.rsvps?.filter((r: any) => r.status === "ATTENDING").length ?? 0;

    return {
      id: event.id,
      title: event.title,
      organizerId: event.organizerId,
      status: event.status,
      capacity: event.capacity,
      attendeeCount,
    };
  }
}