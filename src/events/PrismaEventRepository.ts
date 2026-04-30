import type { IEventRepository } from './EventRepository'
import type { Event, CreateEventInput, EventCategory } from './Event'
import type { PrismaClient } from '@prisma/client'

export class PrismaEventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Event | null> {
    const row = await this.prisma.event.findUnique({ where: { id } })
    if (!row) return null
    return this.toEvent(row)
  }

  async findActive(): Promise<Event[]> {
    const rows = await this.prisma.event.findMany({
      where: { status: 'active' },
      orderBy: { date: 'asc' },
    })
    return rows.map(this.toEvent)
  }

  async findPast(category?: EventCategory): Promise<Event[]> {
    const rows = await this.prisma.event.findMany({
      where: {
        status: 'past',
      },
      orderBy: { endTime: 'desc' },
    })
    const events = rows.map(this.toEvent)
    if (category) return events.filter(e => e.category === category)
    return events
  }

  async save(input: CreateEventInput): Promise<Event> {
    const row = await this.prisma.event.create({
      data: {
        title: input.title,
        status: 'active',
        date: input.startTime,
        endTime: input.endTime,
        capacity: input.capacity,
        createdByUserId: input.organizerId,
      },
    })
    return this.toEvent(row)
  }

  async transitionExpired(): Promise<number> {
    const now = new Date()
    const result = await this.prisma.event.updateMany({
      where: {
        status: 'active',
        endTime: { lte: now },
      },
      data: { status: 'past' },
    })
    return result.count
  }

  private toEvent(row: any): Event {
    return {
      id: row.id,
      title: row.title,
      description: '',
      location: '',
      category: 'other' as EventCategory,
      organizerId: row.createdByUserId,
      startTime: row.date,
      endTime: row.endTime ?? row.date,
      capacity: row.capacity ?? 0,
      status: row.status as 'active' | 'past',
      createdAt: row.createdAt,
    }
  }
}

export function CreatePrismaEventRepository(prisma: PrismaClient): IEventRepository {
  return new PrismaEventRepository(prisma)
}