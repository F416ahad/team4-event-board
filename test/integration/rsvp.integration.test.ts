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

