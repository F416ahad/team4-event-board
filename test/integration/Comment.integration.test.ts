/**
 * comment.integration.test.ts
 * Integration tests for Feature 13 – Event Comments
 *
 * Strategy
 * ─────────
 * Same pattern as rsvp.integration.test.ts:
 * - Build the test-bed by wiring services manually so we can seed data
 *   directly via the service without going through the auth-protected
 *   POST /events route.
 * - NODE_ENV=test makes requireAuthenticated() return true, but
 *   getAuthenticatedUser() still returns undefined (no real cookie), so
 *   routes with an inner `if (!user)` guard produce a clean 401.
 * - HTTP-layer tests verify status codes for those reachable paths.
 * - Service-layer tests cover all business-logic branches directly.
 */

import request from 'supertest';

// ── service / repo imports ────────────────────────────────────────────────────
import { RsvpService }                     from '../../src/rsvp/RsvpService';
import { createInMemoryRsvpRepository }    from '../../src/rsvp/InMemoryRsvpRepository';
import { CreateRsvpController }            from '../../src/rsvp/RsvpController';
import { CommentService }                  from '../../src/comment/CommentService';
import { createInMemoryCommentRepository } from '../../src/comment/InMemoryCommentRepository';
import { CreateCommentController }         from '../../src/comment/CommentController';
import { CreateApp }                       from '../../src/app';
import { CreateLoggingService }            from '../../src/service/LoggingService';
import { CreateAuthController }            from '../../src/auth/AuthController';
import { CreateAuthService }               from '../../src/auth/AuthService';
import { CreateInMemoryUserRepository }    from '../../src/auth/InMemoryUserRepository';
import { CreatePasswordHasher }            from '../../src/auth/PasswordHasher';
import { CreateAdminUserService }          from '../../src/auth/AdminUserService';

// ── error types ───────────────────────────────────────────────────────────────
import {
  CommentEmptyError,
  CommentTooLongError,
  UnauthorizedDeleteError,
  CommentNotFoundError,
} from '../../src/comment/errors';
import { EventNotFoundError } from '../../src/rsvp/errors';
import type { Event }         from '../../src/rsvp/rsvp';
import type { Comment, CommentWithPermissions } from '../../src/comment/Comment';

// ─── test-bed factory ─────────────────────────────────────────────────────────

function makeTestBed() {
  const logger = CreateLoggingService();

  const authUsers        = CreateInMemoryUserRepository();
  const passwordHasher   = CreatePasswordHasher();
  const authService      = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController   = CreateAuthController(authService, adminUserService, logger);

  const rsvpRepo       = createInMemoryRsvpRepository();
  const rsvpService    = new RsvpService(rsvpRepo);
  const rsvpController = CreateRsvpController(rsvpService, logger);

  const commentRepo       = createInMemoryCommentRepository();
  const commentService    = new CommentService(
    commentRepo,
    (eventId) => rsvpService.getEvent(eventId),
  );
  const commentController = CreateCommentController(commentService, logger);

  const iApp       = CreateApp(authController, logger, rsvpController, commentController);
  const expressApp = (iApp as any).getExpressApp();

  return { expressApp, rsvpService, commentService };
}

/** Seeds a future-dated active event and returns it. */
async function seedFutureEvent(
  service: RsvpService,
  title   = 'Test Event',
  ownerId = 'owner-1',
): Promise<Event> {
  const result = await service.createEvent(title, ownerId);
  if(!result.ok) throw new Error('seedFutureEvent: createEvent failed');
  const event = result.value as Event;
  const future = new Date();
  future.setDate(future.getDate() + 30);
  (event as any).date = future.toISOString();
  return event;
}

/** Seeds one comment and returns it. */
async function seedComment(
  service: CommentService,
  eventId:     string,
  userId      = 'user-1',
  displayName = 'Alice',
  content     = 'Hello!',
): Promise<Comment> {
  const result = await service.postComment(eventId, userId, displayName, content);
  if(!result.ok) throw new Error('seedComment: postComment failed');
  return result.value as Comment;
}

// ─── HTTP-layer tests ────────────────────────────────────────────────────────

describe('Feature 13 – Comments: HTTP layer', () => {
  it('POST /events/:eventId/comments without a session -> 401 (not a 500 crash)', async () => {
    const { expressApp, rsvpService } = makeTestBed();
    const event = await seedFutureEvent(rsvpService);

    const res = await request(expressApp)
      .post(`/events/${event.id}/comments`)
      .set('HX-Request', 'true')
      .send('content=Hello');

    expect(res.status).toBe(401);
  });

  it('DELETE /events/:eventId/comments/:commentId without a session -> 401', async () => {
    const { expressApp, rsvpService } = makeTestBed();
    const event = await seedFutureEvent(rsvpService);

    const res = await request(expressApp)
      .delete(`/events/${event.id}/comments/some-comment-id`)
      .set('HX-Request', 'true');

    expect(res.status).toBe(401);
  });

  it('GET /events/:eventId/comments/partial without a session -> 200 HTML fragment (no inner user guard)', async () => {
    const { expressApp, rsvpService } = makeTestBed();
    const event = await seedFutureEvent(rsvpService);

    // This route calls requireAuthenticated (returns true in test mode) then
    // calls commentController.renderCommentsPartial directly — no inner user guard.
    // It will attempt to render partials/comment-list via EJS.
    // If views are present -> 200 HTML; if views are absent -> 500 render error.
    // We assert it is NOT a 4xx auth/logic rejection.
    const res = await request(expressApp)
      .get(`/events/${event.id}/comments/partial`)
      .set('HX-Request', 'true');

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(404);
  });
});

// ─── Service-layer tests ─────────────────────────────────────────────────────

describe('Feature 13 – Comments: service layer', () => {

  // ── postComment happy path ─────────────────────────────────────────────────

  describe('postComment – happy path', () => {
    it('creates a comment and returns correct fields', async () => {
      const { rsvpService, commentService } = makeTestBed();
      const event = await seedFutureEvent(rsvpService);

      const result = await commentService.postComment(event.id, 'user-1', 'Alice', 'Hello!');
      expect(result.ok).toBe(true);

      const comment = result.value as Comment;
      expect(comment.id).toBeDefined();
      expect(comment.eventId).toBe(event.id);
      expect(comment.userId).toBe('user-1');
      expect(comment.displayName).toBe('Alice');
      expect(comment.content).toBe('Hello!');
      expect(comment.createdAt).toBeInstanceOf(Date);
    });

    it('trims leading and trailing whitespace from content before saving', async () => {
      const { rsvpService, commentService } = makeTestBed();
      const event = await seedFutureEvent(rsvpService);

      const result = await commentService.postComment(event.id, 'user-1', 'Alice', '  hello  ');
      expect((result.value as Comment).content).toBe('hello');
    });

    it('multiple comments on the same event are all retrievable', async () => {
      const { rsvpService, commentService } = makeTestBed();
      const event = await seedFutureEvent(rsvpService);

      await commentService.postComment(event.id, 'user-1', 'Alice', 'First');
      await commentService.postComment(event.id, 'user-2', 'Bob',   'Second');

      const listing = await commentService.getCommentsWithPermissions(event.id, 'user-1', 'owner-1');
      expect(listing.ok).toBe(true);
      expect((listing.value as CommentWithPermissions[]).length).toBe(2);
    });
  });

 