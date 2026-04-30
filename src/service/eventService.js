import * as eventRepo from '../repositories/PrismaEventRepository.js';
import { InvalidFilterError, EventNotFoundError, UnauthorizedError, InvalidStateError } from '../core/errors.js';

/**
 * feat 3: update an existing event
 * handles business rules: ownership, admin rights, and valid event state.
 */
export const updateEvent = async (eventId, updateData, currentUser) => {
  // fetch the existing event to check state and permissions
  const existingEvent = await eventRepo.findEventById(eventId);

  if (!existingEvent) {
    return { ok: false, error: new EventNotFoundError() };
  }

  // must be the organizer OR an admin
  const isOrganizer = currentUser?.id === existingEvent.organizerId;
  const isAdmin = currentUser?.role === 'admin';

  if (!isOrganizer && !isAdmin) {
    return { ok: false, error: new UnauthorizedError("You do not have permission to edit this event.") };
  }

  // cannot edit cancelled or past events
  if (existingEvent.status === 'cancelled' || existingEvent.status === 'past') {
    return { ok: false, error: new InvalidStateError("Cannot edit an event that is cancelled or already past.") };
  }

  // if all rules pass, update the database
  const updated = await eventRepo.updateEvent(eventId, updateData);
  return { ok: true, value: updated };
};

/**
 * feature 2: Get details 
 */
export const getEventDetail = async (eventId, currentUser) => {
  const event = await eventRepo.findEventById(eventId);
  
  if (!event) return { ok: false, error: new EventNotFoundError() };
  
  // visibility logic (Drafts only for organizer/admin)
  if (event.status === 'draft') {
    const canSee = currentUser?.id === event.organizerId || currentUser?.role === 'admin';
    if (!canSee) return { ok: false, error: new EventNotFoundError() };
  }

  return { ok: true, value: event };
};