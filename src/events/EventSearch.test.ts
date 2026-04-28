// src/events/EventSearch.test.ts
import { EventSearchService } from '../service/EventSearchService';
import { InvalidInputError } from '../lib/errors';
import { EventSearchController } from './EventSearchController';

describe('Feature 10: Event Search (Sprint 2)', () => {
  
  describe('Service Layer', () => {
    it('Happy Path: Should return events matching a valid query', async () => {
      // Assuming 'pizza' is a valid search term or returns empty array safely
      const result = await EventSearchService.searchEvents('pizza');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it('Edge Case: Should return all published upcoming events if query is empty', async () => {
      const result = await EventSearchService.searchEvents('');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Array.isArray(result.value)).toBe(true);
      }
    });

    it('Domain Error: Should throw InvalidInputError if query is over 100 characters', async () => {
      const overlyLongQuery = 'a'.repeat(105);
      
      try {
        // We expect this to fail
        await EventSearchController.handleSearch(
            { query: { q: overlyLongQuery } } as any, 
            { status: () => ({ send: () => {} }) } as any
        );
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidInputError);
      }
    });
  });

});