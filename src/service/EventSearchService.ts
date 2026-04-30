import { EventSearchRepository } from '../repositories/EventSearchRepository';
import { InvalidInputError } from '../lib/errors';
import { Result, Ok, Err } from '../lib/result';

export const EventSearchService = {
  /**
   * Searches published, upcoming events by title, description, or location.
   * An empty query returns all published upcoming events.
   */
  searchEvents: async (query: string = ""): Promise<Result<any[], Error>> => {
    try {
      // 1. Sprint 2 Domain Error Check (Reject excessively long inputs)
      if (query.length > 100) {
        return Err(new InvalidInputError("Search query exceeds maximum length."));
      }

      // 2. Sprint 3 Prisma Integration: Pass the query to your new database repository
      const events = await EventSearchRepository.searchEvents(query);
      
      // 3. Return the database results using your team's Ok helper
      return Ok(events);

    } catch (err) {
      // Return the error using your team's Err helper
      return Err(new Error("SearchError: Unexpected repository error."));
    }
  }
};