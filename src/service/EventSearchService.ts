import prisma from '../lib/prismaClient';
import { Result, Ok, Err } from '../lib/result';

export const EventSearchService = {
  /**
   * Searches events by title directly in the Prisma database.
   * An empty query returns all active/cancelled events.
   */
  searchEvents: async (query: string = ""): Promise<Result<any[], Error>> => {
    try {
      const search = query.trim();

      const results = await prisma.event.findMany({
        where: {
          // 1. Base filter: Only get active or cancelled events
          status: { 
            in: ['active', 'cancelled'] 
          },
          
          // 2. If there is a search term, ONLY look for it in the title field
          ...(search ? {
            title: { contains: search } // Prisma is happy because 'title' definitely exists!
          } : {})
        },
        // Bonus UX: Order the results so the soonest events show up first
        orderBy: {
          date: 'asc'
        }
      });

      return Ok(results);

    } catch (err) {
      console.error("Database Search Error:", err);
      return Err(new Error("Failed to perform event search"));
    }
  }
};