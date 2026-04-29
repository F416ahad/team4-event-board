import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


export const findFilteredEvents = async (filters) => {
  const query = {
    where: {
      status: 'published', 
    }
  };

  // filter by category if one is selected
  if (filters.category && filters.category !== 'all') {
    query.where.category = filters.category;
  }

  // filter by date range 
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