import * as eventRepo from '../repositories/InMemoryEventRepository.js';
import { InvalidFilterError, EventNotFoundError } from '../core/errors.js';

/**
 * service to handle the logic for viewing event details
 */
export const getEventDetail = async (eventId, currentUser) => {
  const event = await eventRepo.findEventById(eventId);

  if (!event) {
    return { ok: false, error: new EventNotFoundError() };
  }

  if (event.status === 'draft') {
    const isOrganizer = currentUser?.id === event.organizerId;
    const isAdmin = currentUser?.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      return { ok: false, error: new EventNotFoundError() };
    }
  }

  return { ok: true, value: event };
};

/**
 * service to handle the logic for filtering events, feat 6
 */
export const getFilteredEvents = async (filters = {}) => {
  // 1. validation logic for Sprint 2
  const validCategories = ['all', 'Academic', 'Social'];
  const validTimeframes = ['all-upcoming', 'this-week', 'this-weekend'];

  if (filters.category && !validCategories.includes(filters.category)) {
    return { ok: false, error: new InvalidFilterError('category') };
  }
  if (filters.timeframe && !validTimeframes.includes(filters.timeframe)) {
    return { ok: false, error: new InvalidFilterError('timeframe') };
  }

  // 2. fetch data
  const all = await eventRepo.findAll();
  
  // 3. filter Logic (Sprint 1)
  // only published events appear in filtered results
  let filtered = all.filter(e => e.status === 'published');

  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(
      e => e.category.toLowerCase() === filters.category.toLowerCase()
    );
  }

  // timeframe logic (simplified for demo)
  const now = new Date();
  if (filters.timeframe === 'this-week') {
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    filtered = filtered.filter(e => e.startDatetime >= now && e.startDatetime <= nextWeek);
  }

  return { ok: true, value: filtered };
};