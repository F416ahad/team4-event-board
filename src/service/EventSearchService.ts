import { getAllEvents } from '../repositories/InMemoryEventRepository';
import { Result, Ok, Err } from '../lib/result';

export const EventSearchService = {
  /**
   * Searches published, upcoming events by title, description, or location.
   * An empty query returns all published upcoming events.
   */
  searchEvents: async (query: string = ""): Promise<Result<any[], Error>> => {
    try {
      // 1. Get all events using the new function
      const allEvents = getAllEvents(); 

      // 2. Base filter: Only "published" and "upcoming" events
      const now = new Date();
      let results = allEvents.filter(event => 
        event.status === 'published' && 
        new Date(event.startDatetime) >= now
      );

      // 3. If there is a search term, filter further
      if (query.trim() !== "") {
        const lowerQuery = query.toLowerCase().trim();
        
        results = results.filter(event => 
          (event.title && event.title.toLowerCase().includes(lowerQuery)) ||
          (event.description && event.description.toLowerCase().includes(lowerQuery)) ||
          (event.location && event.location.toLowerCase().includes(lowerQuery))
        );
      }

      // 4. Return the filtered results using the Ok helper
      return Ok(results);

    } catch (err) {
      // Return the error using the Err helper
      return Err(new Error("Failed to perform event search"));
    }
  }
};