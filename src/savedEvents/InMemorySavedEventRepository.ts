const savedEventsStore = new Map<string, Set<string>>();

export const SavedEventRepo = {
  
  // Adds an event to the user's saved list
  saveEvent: (userId: string, eventId: string): void => {
    if (!savedEventsStore.has(userId)) {
      savedEventsStore.set(userId, new Set());
    }
    savedEventsStore.get(userId)!.add(eventId);
  },

  // Removes an event from the user's saved list
  unsaveEvent: (userId: string, eventId: string): void => {
    const userSaved = savedEventsStore.get(userId);
    if (userSaved) {
      userSaved.delete(eventId);
    }
  },

  // Retrieves all saved event IDs for a specific user
  getSavedEventIds: (userId: string): string[] => {
    const userSaved = savedEventsStore.get(userId);
    return userSaved ? Array.from(userSaved) : [];
  }
};