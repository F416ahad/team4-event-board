import * as eventRepo from '../repositories/InMemoryEventRepository.js';
import * as repo from '../repositories/eventRepository.js';
import { EventNotFoundError, UnauthorizedError } from '../core/errors.js';

export const getEventById = async (id) => {
    const event = await eventRepo.findEventById(id);
    return event ? { ok: true, value: event } : { ok: false, error: "NotFound" };
};

export const getFilteredEvents = async (filters = {}) => {
    try {
        const allEvents = await eventRepo.findAll();
        let filtered = allEvents.filter(e => e.status === 'published');

        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(e => e.category.toLowerCase() === filters.category.toLowerCase());
        }

        return { ok: true, value: filtered };
    } catch (e) {
        return { ok: false, error: "EventError" };
    }
};

export const getEventDetail = async (id: string, currentUser: any) => {
  const event = await repo.findById(id);
  
  // Requirement: Missing events return 404
  if (!event) return { ok: false, error: new EventNotFoundError() };

  // Requirement: Draft visibility rule
  if (event.status === 'draft') {
    const isOrganizer = currentUser && event.organizerId === currentUser.userId;
    const isAdmin = currentUser && currentUser.role === 'admin';
    
    if (!isOrganizer && !isAdmin) {
      // We return NotFound (404) even for drafts to hide their existence
      return { ok: false, error: new EventNotFoundError() }; 
    }
  }
  
  return { ok: true, value: event };
};