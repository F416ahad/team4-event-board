import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result";
import type { CreateEventFields, RSVPRepository, UpdateEventFields } from "./RsvpRepository";
import type { Event, EventCategory, EventStatus, RSVP, RSVPStatus } from "./rsvp";
import { coerceCategory } from "./rsvp";


export function createPrismaRsvpRepository(prisma: PrismaClient): RSVPRepository {
  return new PrismaRsvpRepository(prisma);
}

function toEvent(row: {
  id: string;
  title: string;
  capacity: number | null;
  status: string;
  date: Date;
  endTime: Date | null;
  category: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt?: Date;
}): Event {
  return {
    id: row.id,
    title: row.title,
    capacity: row.capacity ?? null,
    status: (row.status as EventStatus) ?? "active",
    date: row.date,
    endTime: row.endTime ?? null,
    category: coerceCategory(row.category) as EventCategory,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRsvp(row: {
  id: string;
  userId: string;
  eventId: string;
  status: string;
}): RSVP {
  return {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    status: row.status as RSVPStatus,
  };
}

class PrismaRsvpRepository implements RSVPRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createEvent(input: CreateEventFields): Promise<Result<Event, Error>> {
    try {
      const { title, createdByUserId, capacity, category, date, endTime, creator } = input;

      // Default to 30 days out if no date supplied (preserves prior behaviour).
      const startDate = date ?? (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d;
      })();

      if (creator) {
        await this.prisma.user.upsert({
          where: { id: createdByUserId },
          update: {
            email: creator.email,
            displayName: creator.displayName,
            role: creator.role,
          },
          create: {
            id: createdByUserId,
            email: creator.email,
            displayName: creator.displayName,
            role: creator.role,
            passwordHash: "session-auth-user",
          },
        });
      }

      const row = await this.prisma.event.create({
        data: {
          title,
          createdByUserId,
          date: startDate,
          endTime: endTime ?? null,
          status: "active",
          capacity: capacity ?? null,
          category: category ?? "other",
        },
      });
      return Ok(toEvent(row));
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async getEvent(id: string): Promise<Result<Event | null, Error>> {
    try {
      const row = await this.prisma.event.findUnique({ where: { id } });
      return Ok(row ? toEvent(row) : null);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async getEvents(): Promise<Result<Event[], Error>> {
    try {
      const rows = await this.prisma.event.findMany({ orderBy: { createdAt: "asc" } });
      return Ok(rows.map(toEvent));
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async updateEvent(eventId: string, updates: UpdateEventFields): Promise<Result<Event | null, Error>> {
    try {
      const row = await this.prisma.event.update({
        where: { id: eventId },
        data: {
          title: updates.title,
          capacity: updates.capacity ?? null,
          date: updates.date,
          endTime: updates.endTime ?? null,
          status: updates.status,
          ...(updates.category ? { category: updates.category } : {}),
        },
      });
      return Ok(toEvent(row));
    } catch (e) {
      if (e instanceof Error && (e as { code?: string }).code === "P2025") {
        return Ok(null);
      }
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async addRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<void, Error>> {
    try {
      await this.prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: `${userId}@session.local`,
          displayName: userId,
          role: "user",
          passwordHash: "session-auth-user",
        },
      });

      await this.prisma.rsvp.upsert({
        where: { userId_eventId: { userId, eventId } },
        update: { status },
        create: { userId, eventId, status },
      });
      return Ok(undefined);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async getRSVP(eventId: string, userId: string): Promise<Result<RSVP | null, Error>> {
    try {
      const row = await this.prisma.rsvp.findUnique({
        where: { userId_eventId: { userId, eventId } },
      });
      return Ok(row ? toRsvp(row) : null);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async countGoing(eventId: string): Promise<Result<number, Error>> {
    try {
      const count = await this.prisma.rsvp.count({ where: { eventId, status: "going" } });
      return Ok(count);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  async updateRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<RSVP, Error>> {
    try {
      const row = await this.prisma.rsvp.update({
      where: { userId_eventId: { userId, eventId } },
      data : {status}
      });
      return Ok(toRsvp(row));
        } catch (e) {
          return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
  async getNextWaitlisted(eventId: string): Promise<Result<RSVP | null, Error>> {
    try {
      const row = await this.prisma.rsvp.findFirst({
        where: { eventId, status: "waitlisted" },
        orderBy: { createdAt: "asc" }, // earliest waitlisted
      });
      return Ok(row ? toRsvp(row) : null);
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }
}
