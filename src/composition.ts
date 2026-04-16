import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

// rsvp imports
import { RsvpService } from "./rsvp/RsvpService";
import { CreateRsvpController } from "./rsvp/RsvpController";
import { createInMemoryRsvpRepository } from "./rsvp/InMemoryRsvpRepository";

// comment imports
import { CommentService } from "./comment/CommentService";
import { CreateCommentController } from "./comment/CommentController";
import { createInMemoryCommentRepository } from "./comment/InMemoryCommentRepository";


export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

    // rsvp wiring
    const rsvpRepo = createInMemoryRsvpRepository();
    const rsvpService = new RsvpService(rsvpRepo);
    const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);


  return CreateApp(authController, resolvedLogger);
}
