// src/repositories/SavedEventRepository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SavedEventRepository = {
  async toggleSave(userId: string, eventId: string) {
    const existingSave = await prisma.savedEvent.findUnique({
      where: { userId_eventId: { userId, eventId } }
    });

    if (existingSave) {
      await prisma.savedEvent.delete({
        where: { userId_eventId: { userId, eventId } }
      });
      return "Event removed from saved list";
    } else {
      await prisma.savedEvent.create({
        data: { userId, eventId }
      });
      return "Event saved successfully";
    }
  },

  async getSavedEventsForUser(userId: string) {
    const savedRecords = await prisma.savedEvent.findMany({
      where: { userId },
      select: { eventId: true } 
    });
    
    return savedRecords.map(record => record.eventId);
  }
};