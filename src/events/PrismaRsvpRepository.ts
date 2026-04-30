import type { IRsvpRepository, Rsvp } from './AttendeeService'
import type { PrismaClient } from '@prisma/client'

export class PrismaRsvpRepository implements IRsvpRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEvent(eventId: string): Promise<Rsvp[]> {
    const rows = await this.prisma.rsvp.findMany({
      where: { eventId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map(row => ({
      id: row.id,
      eventId: row.eventId,
      userId: row.userId,
      displayName: row.user.displayName,
      status: row.status as 'attending' | 'waitlisted' | 'cancelled',
      createdAt: row.createdAt,
    }))
  }
}

export function CreatePrismaRsvpRepository(prisma: PrismaClient): IRsvpRepository {
  return new PrismaRsvpRepository(prisma)
}