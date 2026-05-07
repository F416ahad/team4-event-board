import { Request, Response } from 'express';
import { EventSearchService } from '../service/EventSearchService';

export const EventSearchController = {
  
  handleSearch: async (req: Request, res: Response) => {
    const query = (req.query.q as string) || "";
    
    // Call the Service layer
    const result = await EventSearchService.searchEvents(query);

    if (result.ok) {
      // DEBUG LOG: Let's see what the database actually returned
      console.log(`[Search] Query: "${query}" | Found: ${result.value.length} events`);

      return res.render('partials/event-list', { 
        events: result.value, 
        session: req.session, // <-- ADDED THIS in case the partial needs it!
        layout: false 
      });
    } else {
      return res.status(500).send((result.value as Error).message);
    }
  }
};