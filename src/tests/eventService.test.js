import * as eventService from '../service/eventService.js';
import * as eventRepo from '../repositories/PrismaEventRepository.js';

// mock the repository so we don't need a real DB running for logic tests
jest.mock('../repositories/PrismaEventRepository.js');

describe('Feature 3: Event Editing Service Logic', () => {
  const mockUser = { id: 'user-123', role: 'organizer' };
  const mockEvent = {
    id: 'event-1',
    title: 'Old Title',
    organizerId: 'user-123',
    status: 'published',
    startDatetime: new Date(Date.now() + 86400000) // future date
  };
  test('should reject editing if the event is in the past', async () => {
    // mock a past event
    const pastEvent = { ...mockEvent, status: 'past' };
    eventRepo.findEventById.mockResolvedValue(pastEvent);

    const result = await eventService.updateEvent('event-1', { title: 'New' }, mockUser);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain('already past');
  });

  test('should reject editing if user is not the owner or admin', async () => {
    eventRepo.findEventById.mockResolvedValue(mockEvent);
    const wrongUser = { id: 'stranger-danger', role: 'user' };

    const result = await eventService.updateEvent('event-1', { title: 'New' }, wrongUser);

    expect(result.ok).toBe(false);
    expect(result.error.message).toContain('permission');
  });
});