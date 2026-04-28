import { SavedEventRepo } from "./InMemorySavedEventRepository";
import { Result } from "../lib/result";

export const SavedEventService = {
  /**
   * Toggles the saved status of an event.
   * If it's already saved, it unsaves it. If not, it saves it.
   */
  toggleSave: async (userId: string, eventId: string): Promise<Result<string, Error>> => {
    try {
      // 1. Get current saved IDs
      const savedIds = SavedEventRepo.getSavedEventIds(userId);
      
      // 2. Check if already saved
      const isAlreadySaved = savedIds.includes(eventId);

      if (isAlreadySaved) {
        SavedEventRepo.unsaveEvent(userId, eventId);
        return { ok: true, value: "Event removed from saved list" };
      } else {
        SavedEventRepo.saveEvent(userId, eventId);
        return { ok: true, value: "Event saved successfully" };
      }
    } catch (err) {
      return { ok: false, value: new Error("Failed to toggle save status")};
    }
  },

  /**
   * Gets all saved events for a user
   */
  getSavedEventsForUser: async (userId: string): Promise<Result<string[], Error>> => {
    const ids = SavedEventRepo.getSavedEventIds(userId);
    return { ok: true, value: ids };
  }
};