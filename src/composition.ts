// src/composition.ts
import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
import { EventService }from "./rsvp/waitlistService";
import { CreateRsvpController } from "./rsvp/waitlistController";
import { PrismaClient, Prisma } from "@prisma/client";

// IMPORT event controller
// @ts-ignore
import * as eventController from "./controllers/eventController.js";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();
  const prisma = new PrismaClient();

  // ── Auth wiring ───────────────────────────────────────────────────
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  const rsvpService = new EventService(prisma);
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);
  

  return CreateApp(authController, resolvedLogger, rsvpController, rsvpService, adminUserService, authService);
}