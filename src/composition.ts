import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
import { CreateArchiveController } from "./events/ArchiveController";
import { CreateArchiveService } from "./events/ArchiveService";
import { CreateAttendeeController } from "./events/AttendeeController";
import { CreateAttendeeService } from "./events/AttendeeService";
import { CreatePrismaEventRepository } from "./events/PrismaEventRepository";
import { CreatePrismaRsvpRepository as CreatePrismaAttendeeRsvpRepository } from "./events/PrismaRsvpRepository";
// rsvp imports
import { RsvpService } from "./rsvp/RsvpService";
import { CreateRsvpController } from "./rsvp/RsvpController";

// comment imports
import { CommentService } from "./comment/CommentService";
import { CreateCommentController } from "./comment/CommentController";
``
import prisma                            from "./lib/prismaClient";
import { createPrismaRsvpRepository }    from "./rsvp/PrismaRsvpRepository";
import { createPrismaCommentRepository } from "./comment/PrismaCommentRepository";

// event dashboard imports
import { DashboardService } from "./event_dash/EventService";
import { CreateDashboardController, DashboardController } from "./event_dash/EventController";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // ── Auth wiring ───────────────────────────────────────────────────
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

    // rsvp wiring
    const rsvpRepo = createPrismaRsvpRepository(prisma);
    const rsvpService = new RsvpService(rsvpRepo);
    const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);

    // comment wiring (depends on rsvpService for event lookup)
    const commentRepo = createPrismaCommentRepository(prisma);
    const commentService = new CommentService(
        commentRepo,
        async (eventId: string) => await rsvpService.getEvent(eventId)
    );
    const commentController = CreateCommentController(commentService, resolvedLogger);

// Feature 11 & 12 — Prisma-backed repositories
  const eventRepo = CreatePrismaEventRepository(prisma);
  const attendeeRsvpRepo = CreatePrismaAttendeeRsvpRepository(prisma);
  const archiveService = CreateArchiveService(eventRepo);
  const attendeeService = CreateAttendeeService(attendeeRsvpRepo, eventRepo);
  const archiveController = CreateArchiveController(archiveService);
  const attendeeController = CreateAttendeeController(attendeeService);

  // transition expired events on startup, then every 60 seconds
  archiveService.transitionExpired();
  setInterval(() => archiveService.transitionExpired(), 60_000);

  // event dashboard wiring 
  const dashboardService = new DashboardService(prisma);
  const dashboardController = CreateDashboardController(dashboardService, resolvedLogger);

  
  return CreateApp(
    authController,
    archiveController,
    attendeeController,
    resolvedLogger,
    rsvpController,
    commentController,
    dashboardController,
  );
}

export function compose() {
  const logger = CreateLoggingService();

  const authUsers        = CreateInMemoryUserRepository();
  const passwordHasher   = CreatePasswordHasher();
  const authService      = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController   = CreateAuthController(authService, adminUserService, logger);

  const rsvpRepo       = createPrismaRsvpRepository(prisma);
  const rsvpService    = new RsvpService(rsvpRepo);
  const rsvpController = CreateRsvpController(rsvpService, logger);

  const commentRepo       = createPrismaCommentRepository(prisma);
  const commentService    = new CommentService(
    commentRepo,
    (eventId) => rsvpService.getEvent(eventId),
  );
  const commentController = CreateCommentController(commentService, logger);

  return { authController, logger, rsvpController, commentController };
}
