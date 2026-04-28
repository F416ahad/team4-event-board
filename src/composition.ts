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
import { CreateInMemoryEventRepository } from "./events/InMemoryEventRepository";
import { CreateInMemoryRsvpRepository } from "./events/InMemoryRsvpRepository";

// rsvp imports
import { RsvpService } from "./rsvp/RsvpService";
import { CreateRsvpController } from "./rsvp/RsvpController";

// comment imports
import { CommentService } from "./comment/CommentService";
import { CreateCommentController } from "./comment/CommentController";

import prisma                            from "./lib/prismaClient";
import { createPrismaRsvpRepository }    from "./rsvp/PrismaRsvpRepository";
import { createPrismaCommentRepository } from "./comment/PrismaCommentRepository";


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

  const eventRepo = CreateInMemoryEventRepository();
  const attendeeRsvpRepo = CreateInMemoryRsvpRepository();
  const archiveService = CreateArchiveService(eventRepo);
  const attendeeService = CreateAttendeeService(attendeeRsvpRepo, eventRepo);
  const archiveController = CreateArchiveController(archiveService);
  const attendeeController = CreateAttendeeController(attendeeService);

  return CreateApp(
    authController,
    archiveController,
    attendeeController,
    resolvedLogger,
    rsvpController,
    commentController,
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
