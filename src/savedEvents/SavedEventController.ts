// src/savedEvents/SavedEventController.ts
import { Request, Response } from 'express';
import { SavedEventService } from './SavedEventService';
import { getAllEvents } from '../repositories/InMemoryEventRepository';
import { getAuthenticatedUser, type AppSessionStore } from '../session/AppSession';

export const SavedEventController = {
  
  toggleSave: async (req: Request, res: Response) => {
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";

    const result = await SavedEventService.toggleSave(user.userId, eventId);

    if (result.ok) {
      const isHtmx = req.get("HX-Request") === "true";
      const isNowSaved = result.value === "Event saved successfully";
      
      if (isHtmx) {
        // RENDER THE NEW PARTIAL HERE
        return res.status(200).render("partials/save-button", { 
          event: { id: eventId }, 
          isSaved: isNowSaved,
          layout: false // Ensure no full layout is wrapped around the partial
        });
      }
      
      return res.status(200).send(result.value);
    } else {
      const err = result.value as Error;
      if (err.name === "InvalidSaveError") {
        return res.status(400).send(err.message);
      }
      return res.status(500).send(err.message);
    }
  },

  showSavedList: async (req: Request, res: Response) => {
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    
    if (!user) {
      return res.redirect('/login');
    }

    const result = await SavedEventService.getSavedEventsForUser(user.userId);
    
    if (!result.ok) {
      return res.status(500).send((result.value as Error).message);
    }

    const savedIds = result.value;

    const allEvents = getAllEvents();
    const savedEvents = allEvents.filter(event => savedIds.includes(event.id));

    // Make sure 'savedEvents' is the variable name your list.ejs expects (e.g., 'events' vs 'savedEvents')
    return res.render('savedEvents/list', { events: savedEvents }); 
  }
};