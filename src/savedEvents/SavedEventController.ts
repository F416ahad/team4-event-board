// src/savedEvents/SavedEventController.ts
import { Request, Response } from 'express';
import { SavedEventService } from './SavedEventService';
import prisma from '../lib/prismaClient';
import { getAuthenticatedUser, type AppSessionStore } from '../session/AppSession';

export const SavedEventController = {
  
  /**
   * POST: Toggles the save status of an event.
   * Requirement: "updating inline without a full page reload"
   * So we return a simple 200 OK response instead of a redirect.
   */
  toggleSave: async (req: Request, res: Response) => {
    // 1. Parse request: Get user and event ID
    const store = req.session as AppSessionStore;
    const user = getAuthenticatedUser(store);
    
    if (!user) {
      return res.status(401).send("Unauthorized");
    }

    const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";

    // 2. Call Service
    const result = await SavedEventService.toggleSave(user.userId, eventId);

    // 3. Map Result to Response (Sprint 2 HTMX Upgrade)
    if (result.ok) {
      const isHtmx = req.get("HX-Request") === "true";
      
      const isNowSaved = result.value === "Event saved successfully";
      
      if (isHtmx) {
        const btnText = isNowSaved ? "Remove from Saved" : "Save for Later";
        const btnColor = isNowSaved ? "#ff4d4d" : "#28a745";
        
        const htmxButton = `
          <button 
            hx-post="/events/${eventId}/save" 
            hx-swap="outerHTML" 
            style="background: ${btnColor}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
            ${btnText}
          </button>
        `;
        return res.status(200).send(htmxButton);
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

  /**
   * GET: Displays the user's saved list dashboard.
   */
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

    // Look up the real events from Prisma (the legacy in-memory store only had
    // one hardcoded test row, so saved real events never showed up).
    const savedEvents =
      savedIds.length > 0
        ? await prisma.event.findMany({
            where: { id: { in: savedIds } },
            orderBy: { date: 'asc' },
          })
        : [];

    // Pass session so layouts/base.ejs can render the nav.
    return res.render('savedEvents/list', {
      events: savedEvents,
      session: store.app ?? null,
    });
  }
};