// src/savedEvents/SavedEvent.test.ts
import { SavedEventController } from './SavedEventController';
import { SavedEventService } from './SavedEventService';
import { InvalidSaveError } from '../lib/errors';

// We mock the service so we can isolate and test the Controller's HTTP logic
jest.mock('./SavedEventService');

describe('Feature 14: Save for Later (Sprint 2)', () => {

  // Mock Request and Response objects
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    mockReq = {
      params: { eventId: 'event-123' },
      // Mock an authenticated user session
      session: { appSession: { user: { userId: 'user-1', role: 'user' } } },
      get: jest.fn()
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      render: jest.fn(),
      redirect: jest.fn()
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('HTMX Dynamic UI', () => {
    it('Happy Path: Should return an HTML button fragment for HTMX requests', async () => {
      // Simulate an HTMX request
      mockReq.get.mockImplementation((header: string) => header === 'HX-Request' ? 'true' : 'false');
      
      // Simulate the service returning a success state
      (SavedEventService.toggleSave as jest.Mock).mockResolvedValue({ 
        ok: true, 
        value: "Event saved successfully" 
      });

      await SavedEventController.toggleSave(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      // Prove that it returns an HTML button instead of JSON
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('<button'));
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Remove from Saved'));
    });
  });

  describe('Domain Errors', () => {
    it('Should return 400 Bad Request when an InvalidSaveError occurs', async () => {
      // Simulate trying to save a cancelled event
      const domainError = new InvalidSaveError("Cannot save a cancelled event.");
      (SavedEventService.toggleSave as jest.Mock).mockResolvedValue({ 
        ok: false, 
        value: domainError 
      });

      await SavedEventController.toggleSave(mockReq, mockRes);

      // Prove the controller correctly maps the domain error to a 400 status
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith("Cannot save a cancelled event.");
    });
  });

});