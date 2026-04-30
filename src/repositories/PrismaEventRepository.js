import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * gets an event for the service layer to check 
 * permissions (ownership/role) and state (not past/cancelled).
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
      // capacity is a number or null
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