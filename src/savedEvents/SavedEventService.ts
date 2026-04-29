// src/savedEvents/SavedEventService.ts
import { SavedEventRepository } from '../repositories/SavedEventRepository';
import { InvalidSaveError } from '../lib/errors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SavedEventService = {
  async toggleSave(userId: string, eventId: string) {
    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      
      if (!event || event.status === "cancelled") {
        return { ok: false as const, value: new InvalidSaveError("Cannot save an invalid or cancelled event.") };
      }

      const resultMessage = await SavedEventRepository.toggleSave(userId, eventId);
      return { ok: true as const, value: resultMessage };

    } catch (error) {
      return { ok: false as const, value: new Error("SaveError: Unexpected repository error.") };
    }
  },

  async getSavedEventsForUser(userId: string) {
    try {
      const eventIds = await SavedEventRepository.getSavedEventsForUser(userId);
      return { ok: true as const, value: eventIds };
    } catch (error) {
      return { ok: false as const, value: new Error("SaveError: Unexpected repository error.") };
    }
  }
};