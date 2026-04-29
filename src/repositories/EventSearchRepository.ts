// src/repositories/EventSearchRepository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const EventSearchRepository = {
  async searchEvents(query: string) {
    const searchFilter = query.trim() ? {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { location: { contains: query } }
      ]
    } : {};

    return await prisma.event.findMany({
      where: {
        status: "published",
        date: { gte: new Date() }, // Only upcoming events
        ...searchFilter
      }
    });
  }
};