import * as eventService from '../service/eventService.js';

/**
 * Feature 6: List and Filter Events
 * Handles both full-page loads and HTMX partial updates.
 */
export const listEvents = async (req, res) => {
  // 1. Pull filters from the URL query string
  const filters = {
    category: req.query.category || 'all',
    timeframe: req.query.timeframe || 'all'
  };

  // 2. Call the service (now using Prisma logic)
  const result = await eventService.getFilteredEvents(filters);