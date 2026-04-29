import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Feature 6: Filtered Event List
 * Uses Prisma's 'where' clause to filter by category and date range.
 */
export const findFilteredEvents = async (filters) => {
  const query = {
    where: {
      status: 'published', // Sprint 1 requirement: Only published events
    }
  };

  // Filter by category if one is selected
  if (filters.category && filters.category !== 'all') {
    query.where.category = filters.category;
  }

  // Filter by date range (GTE = Greater Than or Equal, LTE = Less Than or Equal)
  if (filters.startDate && filters.endDate) {
    query.where.startDatetime = {
      gte: filters.startDate,
      lte: filters.endDate
    };
  }

  return await prisma.event.findMany({
    ...query,
    orderBy: { startDatetime: 'asc' }
  });
};