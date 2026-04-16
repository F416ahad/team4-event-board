import { Request, Response } from 'express';
import { EventSearchService } from '../service/EventSearchService';

export const EventSearchController = {
  
  /**
   * Handles the GET request for the event search page
   * Example URL: /events/search?q=pizza
   */
  handleSearch: async (req: Request, res: Response) => {
    // 1. Parse the request: Extract the search term 'q' from the query parameters
    const query = (req.query.q as string) || "";

    // 2. Call the Service layer
    const result = await EventSearchService.searchEvents(query);

    // 3. Map the Result pattern to an HTTP response
    if (result.ok) {
      // Success: Render a template and pass the events to it
      // (We will build this template in the next branch!)
      return res.render('events/search', { 
        events: result.value, 
        searchQuery: query 
      });
    } else {
      // Failure: Send back the error message
      return res.status(500).send(result.value.message);
    }
  }
};