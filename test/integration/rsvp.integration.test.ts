/**
 * rsvp.integration.test.ts
 * Integration tests for Feature 4 – RSVP Toggle
 *
 * Strategy
 * ─────────
 * The Express app sets NODE_ENV=test which makes requireAuthenticated()
 * return true, bypassing the session check.  However, getAuthenticatedUser()
 * still returns undefined because there is no real session cookie, so any
 * route that does `if (!user) { res.status(401)… }` will 401 before reaching
 * the controller.
 *
 * Solution: build the test-bed by wiring services manually (same pattern as
 * composition.ts) so we can seed events directly via the service AND still
 * have a real Express app to fire HTTP requests against.
 *
 * The HTTP-layer tests cover routes that do NOT have the inner user-guard
 * (domain error paths that reach the controller error handler).
 * The service-layer tests cover every business-logic branch directly.
 */

import request from 'supertest';

// ── service / repo imports ────────────────────────────────────────────────────
import { RsvpService }                   from '../../src/rsvp/RsvpService';
import { createInMemoryRsvpRepository }  from '../../src/rsvp/InMemoryRsvpRepository';
import { CreateRsvpController }          from '../../src/rsvp/RsvpController';
import { CommentService }                from '../../src/comment/CommentService';
import { createInMemoryCommentRepository } from '../../src/comment/InMemoryCommentRepository';
import { CreateCommentController }       from '../../src/comment/CommentController';
import { CreateApp }                     from '../../src/app';
import { CreateLoggingService }          from '../../src/service/LoggingService';
import { CreateAuthController }          from '../../src/auth/AuthController';
import { CreateAuthService }             from '../../src/auth/AuthService';
import { CreateInMemoryUserRepository }  from '../../src/auth/InMemoryUserRepository';
import { CreatePasswordHasher }          from '../../src/auth/PasswordHasher';
import { CreateAdminUserService }        from '../../src/auth/AdminUserService';

// ── error types ───────────────────────────────────────────────────────────────
import {
  EventNotFoundError,
  EventCancelledError,
  EventPastError,
} from '../../src/rsvp/errors';
import type { Event, RSVP } from '../../src/rsvp/rsvp';

// ─── test-bed factory ─────────────────────────────────────────────────────────

/**
 * Builds a fully isolated Express app + the underlying RsvpService.
 * Each call creates a brand-new in-memory store — no shared state between tests.
 */
function makeTestBed() {
  const logger = CreateLoggingService();

  const authUsers       = CreateInMemoryUserRepository();
  const passwordHasher  = CreatePasswordHasher();
  const authService     = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController  = CreateAuthController(authService, adminUserService, logger);

  const rsvpRepo        = createInMemoryRsvpRepository();
  const rsvpService     = new RsvpService(rsvpRepo);
  const rsvpController  = CreateRsvpController(rsvpService, logger);

  const commentRepo     = createInMemoryCommentRepository();
  const commentService  = new CommentService(
    commentRepo,
    (eventId) => rsvpService.getEvent(eventId),
  );
  const commentController = CreateCommentController(commentService, logger);

  const iApp      = CreateApp(authController, logger, rsvpController, commentController);
  const expressApp = (iApp as any).getExpressApp();

  return { expressApp, rsvpService };
}

/** Seeds a future-dated active event and returns it. */
async function seedFutureEvent(
  service: RsvpService,
  title    = 'Test Event',
  ownerId  = 'owner-1',
  capacity?: number,
): Promise<Event> {
  const result = await service.createEvent(title, ownerId, capacity);

  if(!result.ok) throw new Error('seedFutureEvent: createEvent failed');
  const event = result.value as Event;
  
  // Push the date 30 days forward so the EventPastError guard never fires
  const future = new Date();
  future.setDate(future.getDate() + 30);
  (event as any).date = future.toISOString();
  return event;
}

// ─── HTTP-layer tests ────────────────────────────────────────────────────────
//
// In NODE_ENV=test, requireAuthenticated() returns true.
// The inner `if (!user)` guard inside the RSVP toggle route checks
// getAuthenticatedUser() which returns undefined without a real cookie,
// producing a 401.  We verify this is a clean 401 (not a 500 crash).
// For domain-error paths we test directly at the service layer below.

describe('Feature 4 – RSVP Toggle: HTTP layer', () => {

  it('POST /events/:eventId/rsvp without a session -> 401 (not a 500 crash)', async () => {
    const { expressApp, rsvpService } = makeTestBed();
    const event = await seedFutureEvent(rsvpService);

    const res = await request(expressApp)
      .post(`/events/${event.id}/rsvp`)
      .set('HX-Request', 'true');

    // 401 = auth guard fired correctly; anything else is a bug
    expect(res.status).toBe(401);
  });

  it('POST /events/:eventId/rsvp for a non-existent event -> 401 (auth guard before domain logic)', async () => {
    const { expressApp } = makeTestBed();

    const res = await request(expressApp)
      .post('/events/does-not-exist/rsvp')
      .set('HX-Request', 'true');

    // Still 401 because the user guard fires first
    expect(res.status).toBe(401);
  });

  it('GET /api/events/:eventId/rsvp/status without a session -> 401', async () => {
    const { expressApp, rsvpService } = makeTestBed();
    const event = await seedFutureEvent(rsvpService);

    const res = await request(expressApp)
      .get(`/api/events/${event.id}/rsvp/status`);

    expect(res.status).toBe(401);
  });

  it('GET /api/events/:eventId/count-going without a session -> 200 JSON (no user guard on this route)', async () => {
    const { expressApp, rsvpService } = makeTestBed();
    const event = await seedFutureEvent(rsvpService);

    // this route calls requireAuthenticated (returns true in test mode) then
    // immediately calls the controller — there is no inner user guard.
    const res = await request(expressApp)
      .get(`/api/events/${event.id}/count-going`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count', 0);
  });
});

// ─── Service-layer tests ─────────────────────────────────────────────────────
//
// these bypass HTTP entirely and test the full Result-pattern business logic

describe('Feature 4 – RSVP Toggle: service layer', () => {

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe('toggle happy path', () => {
    it('first toggle → status is going', async () => {
      const { rsvpService } = makeTestBed();
      const event = await seedFutureEvent(rsvpService);

      const result = await rsvpService.toggleRSVP(event.id, 'user-1');
      expect(result.ok).toBe(true);

      const rsvpResult = await rsvpService.getUserRsvp(event.id, 'user-1');
      expect(rsvpResult.ok).toBe(true);
      expect((rsvpResult.value as RSVP).status).toBe('going');
    });

    it('second toggle cancels an active RSVP', async () => {
      const { rsvpService } = makeTestBed();
      const event = await seedFutureEvent(rsvpService);

      await rsvpService.toggleRSVP(event.id, 'user-1');  //  going
      await rsvpService.toggleRSVP(event.id, 'user-1');  //  cancelled

      const rsvpResult = await rsvpService.getUserRsvp(event.id, 'user-1');
      expect((rsvpResult.value as RSVP).status).toBe('cancelled');
    });

    it('third toggle reactivates a cancelled RSVP to going', async () => {
      const { rsvpService } = makeTestBed();
      const event = await seedFutureEvent(rsvpService);

      await rsvpService.toggleRSVP(event.id, 'user-1');  // going
      await rsvpService.toggleRSVP(event.id, 'user-1');  // cancelled
      await rsvpService.toggleRSVP(event.id, 'user-1');  // going again

      const rsvpResult = await rsvpService.getUserRsvp(event.id, 'user-1');
      expect((rsvpResult.value as RSVP).status).toBe('going');
    });

    it('attendee count increments on RSVP and decrements on cancel', async () => {
      const { rsvpService } = makeTestBed();
      const event = await seedFutureEvent(rsvpService);

      await rsvpService.toggleRSVP(event.id, 'user-1');
      const after = await rsvpService.countGoing(event.id);
      expect(after.value).toBe(1);

      await rsvpService.toggleRSVP(event.id, 'user-1');  // cancel
      const afterCancel = await rsvpService.countGoing(event.id);
      expect(afterCancel.value).toBe(0);
    });
  });

  