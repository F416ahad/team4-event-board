import { SavedEventRepository } from '../repositories/SavedEventRepository';
import { InvalidSaveError } from '../lib/errors';
import { PrismaClient } from '@prisma/client';
import { Result, Ok, Err } from '../lib/result';

const prisma = new PrismaClient();

export const SavedEventService = {
  /**
   * Toggles the saved status of an event.
   * If it's already saved, it unsaves it. If not, it saves it.
   */
  toggleSave: async (userId: string, eventId: string): Promise<Result<string, Error>> => {
    try {
      // 1. Sprint 2 Domain Error Check: Make sure event exists and isn't cancelled
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      
      if (!event || event.status === "cancelled") {
        return Err(new InvalidSaveError("Cannot save an invalid or cancelled event."));
      }

      // 2. Sprint 3 Prisma Integration: Call the repository
      const resultMessage = await SavedEventRepository.toggleSave(userId, eventId);
      
      return Ok(resultMessage);

    } catch (err) {
      return Err(new Error("SaveError: Failed to toggle save status."));
    }
  },

  /**
   * Gets all saved events for a user
   */
  getSavedEventsForUser: async (userId: string): Promise<Result<string[], Error>> => {
    try {
      // Sprint 3 Prisma Integration
      const ids = await SavedEventRepository.getSavedEventsForUser(userId);
      return Ok(ids);
    } catch (err) {
      return Err(new Error("SaveError: Failed to retrieve saved events."));
    }
  }
};