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

  // filter by date range (GTE = Greater Than or Equal, LTE = Less Than or Equal)
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

/**
 *
 * used to check permissions (ownership) and state (not past/cancelled).
 */
export const findEventById = async (id) => {
  return await prisma.event.findUnique({
    where: { id: id },
  });
};


export const updateEvent = async (eventId, updateData) => {
  return await prisma.event.update({
    where: { id: eventId },
    data: {
      title: updateData.title,
      description: updateData.description,
      location: updateData.location,
      category: updateData.category,
      // Ensure capacity is stored as an integer or null
      capacity: updateData.capacity ? parseInt(updateData.capacity) : null,
      status: updateData.status,
      startDatetime: new Date(updateData.startDatetime),
      endDatetime: new Date(updateData.endDatetime),
    },
  });
};


export const findAllEvents = async () => {
  return await prisma.event.findMany({
    orderBy: { startDatetime: 'asc' }
  });
};