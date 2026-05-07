import type { IEventRepository } from "./EventRepository"
import type { Event, CreateEventInput, EventCategory, EventStatus } from "./Event"
import { coerceCategory } from "./Event"
import type { PrismaClient } from "@prisma/client"

export class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Event | null> {
    const row = await this.prisma.event.findUnique({ where: { id } })
    if (!row) return null
    return this.toEvent(row)
  }

  async findActive(): Promise<Event[]> {
    const rows = await this.prisma.event.findMany({
      where: { status: "active" },
      orderBy: { date: "asc" },
    })
    return rows.map((r) => this.toEvent(r))
  }

  async findPast(category?: EventCategory): Promise<Event[]> {
    const rows = await this.prisma.event.findMany({
      where: { status: "past" },
      orderBy: [{ endTime: "desc" }, { date: "desc" }],
    })
    const events = rows.map((r) => this.toEvent(r))
    if (category) return events.filter((e) => e.category === category)
    return events
  }

  async save(input: CreateEventInput): Promise<Event> {
    const row = await this.prisma.event.create({
      data: {
        title: input.title,
        status: "active",
        date: input.date,
        endTime: input.endTime ?? null,
        capacity: input.capacity ?? null,
        category: input.category ?? "other",
        createdByUserId: input.createdByUserId,
      },
    })
    return this.toEvent(row)
  }

  async transitionExpired(): Promise<number> {
    const now = new Date()
    // Auto-archive: any active event whose endTime has passed.
    // Events without an endTime stay active until the organizer cancels them.
    const result = await this.prisma.event.updateMany({
      where: {
        status: "active",
        endTime: { lte: now },
      },
      data: { status: "past" },
    })
    return result.count
  }

  private toEvent(row: {
    id: string
    title: string
    capacity: number | null
    status: string
    date: Date
    endTime: Date | null
    category: string
    createdByUserId: string
    createdAt: Date
    updatedAt?: Date
  }): Event {
    return {
      id: row.id,
      title: row.title,
      capacity: row.capacity ?? null,
      status: (row.status as EventStatus) ?? "active",
      date: row.date,
      endTime: row.endTime ?? null,
      category: coerceCategory(row.category),
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  }
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
  return new PrismaEventRepository(prisma)
}
