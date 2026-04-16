// src/savedEvents/SavedEventController.ts
import { Request, Response } from 'express';
import { SavedEventService } from './SavedEventService';
import { getAllEvents } from '../repositories/InMemoryEventRepository';
import { getAuthenticatedUser, sessionStore } from '../session/AppSession';

export const SavedEventController = {
  
  /**
   * POST: Toggles the save status of an event.
   * Requirement: "updating inline without a full page reload"
   * So we return a simple 200 OK response instead of a redirect.
   */
  toggleSave: async (req: Request, res: Response) => {
    // 1. Parse request: Get user and event ID
    const store = sessionStore(req);
    const user = getAuthenticatedUser(store);
    
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";

    // 2. Call Service
    const result = await SavedEventService.toggleSave(user.userId, eventId);

    // 3. Map Result to Response
    if (result.ok) {
      return res.status(200).send(result.value);
    } else {
      return res.status(500).send((result.value as Error).message);
    }
  },

  /**
   * GET: Displays the user's saved list dashboard.
   */
  showSavedList: async (req: Request, res: Response) => {
    // 1. Parse request: Get user
    const store = sessionStore(req);
    const user = getAuthenticatedUser(store);
    
    if (!user) {
      return res.redirect('/login');
    }

    // 2. Call Service to get the list of saved IDs
    const result = await SavedEventService.getSavedEventsForUser(user.userId);
    
    if (!result.ok) {
      return res.status(500).send(result.value.message);
    }

    const savedIds = result.value;

    // 3. Fetch the full event details for those IDs using your teammate's repo
    const allEvents = getAllEvents();
    const savedEvents = allEvents.filter(event => savedIds.includes(event.id));

    // 4. Map Result to Response (Render the template)
    return res.render('savedEvents/list', { events: savedEvents });
  }
};