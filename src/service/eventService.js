import * as eventRepo from '../repositories/InMemoryEventRepository.js';

/**
 * service to handle the logic for viewing event details
 * 
 * * @param {string} eventId 
 * @param {Object} currentUser 
 * @returns {Object} result pattern: { ok: boolean, value?: Object, error?: string }
 */
export const getEventDetail = async (eventId, currentUser) => {
  const event = await eventRepo.findEventById(eventId);

  // rule 1: If it doesn't exist in the repo it's a 404
  if (!event) {
    return { ok: false, error: "Event not found" };
  }

  // rule 2: any user can see 'published' events but drafts are restricted.
  if (event.status === 'draft') {
    const isOrganizer = currentUser?.id === event.organizerId;
    const isAdmin = currentUser?.role === 'admin';

    if (!isOrganizer && !isAdmin) {
      // security by obscurity: return "Not found" so unauthorized users 
      // don't even know a draft exists at this ID
      return { ok: false, error: "Event not found" };
    }
  }

  // success path
  return { ok: true, value: event };
};