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

