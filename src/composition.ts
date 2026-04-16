import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";

import { RsvpService } from "./rsvp/RsvpService";
import { CreateRsvpController } from "./rsvp/RsvpController";
import { createInMemoryRsvpRepository } from "./rsvp/InMemoryRsvpRepository";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

   // RSVP wiring
  const rsvpRepo = createInMemoryRsvpRepository(); // initialize rsvp in-memory repo
  const rsvpService = new RsvpService(rsvpRepo); // create rsvp service using repository
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger); // create rsvp controller with service and logger
  
  return CreateApp(authController, resolvedLogger, rsvpController); // combine controllers and logger into app instance
}
