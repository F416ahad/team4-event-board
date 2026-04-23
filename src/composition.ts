import { CreateAdminUserService } from "./auth/AdminUserService";
import { CreateAuthController } from "./auth/AuthController";
import { CreateAuthService } from "./auth/AuthService";
import { CreateInMemoryUserRepository } from "./auth/InMemoryUserRepository";
import { CreatePasswordHasher } from "./auth/PasswordHasher";
import { CreateApp } from "./app";
import type { IApp } from "./contracts";
import { CreateLoggingService } from "./service/LoggingService";
import type { ILoggingService } from "./service/LoggingService";
import { InMemoryEventRepository } from "./events/InMemoryEventRepository";
import { CreateArchiveService } from "./events/ArchiveService";
import { CreateArchiveController } from "./events/ArchiveController";
import { CreateAttendeeService } from "./events/AttendeeService";
import { CreateAttendeeController } from "./events/AttendeeController";
import { CreateInMemoryRsvpRepository } from "./events/InMemoryRsvpRepository";
import { CommentService } from "./comment/CommentService";
import { CreateCommentController } from "./comment/CommentController";
import { createInMemoryCommentRepository } from "./comment/InMemoryCommentRepository";
import { DashboardService } from "./event_dash/EventService";
import { CreateDashboardController } from "./event_dash/EventController";
import { EventService } from "./rsvp/waitlistService";
import { CreateRsvpController } from "./rsvp/waitlistController";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();
  //const prisma = new PrismaClient();
  const sqlite = new Database(process.env.DATABASE_URL?.replace('file:./', '') ?? './prisma/dev.db');
  const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL?.replace('file:', '') ?? './prisma/dev.db',
  });
  const prisma = new PrismaClient({ adapter });

  // ── Auth wiring ───────────────────────────────────────────────────
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // ── Archive & Attendee wiring (Features 11 & 12) ──────────────────
  const eventRepo = new InMemoryEventRepository();
  const rsvpRepo = CreateInMemoryRsvpRepository();
  const archiveService = CreateArchiveService(eventRepo);
  const archiveController = CreateArchiveController(archiveService);
  const attendeeService = CreateAttendeeService(rsvpRepo, eventRepo);
  const attendeeController = CreateAttendeeController(attendeeService);

  // Dev seed data
  const now = new Date();
  const past = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  eventRepo.seed([
    {
      title: 'Opening Keynote',
      description: 'Annual kickoff event.',
      location: 'Main Hall',
      category: 'academic',
      organizerId: 'organizer-1',
      startTime: past(5),
      endTime: past(4),
      capacity: 200,
      status: 'past',
    },
    {
      title: 'Hackathon 2024',
      description: '24-hour coding competition.',
      location: 'Engineering Lab',
      category: 'tech',
      organizerId: 'organizer-1',
      startTime: past(30),
      endTime: past(6),
      capacity: 50,
      status: 'past',
    },
    {
      title: 'Spring Social',
      description: 'End of semester social.',
      location: 'Courtyard',
      category: 'social',
      organizerId: 'organizer-1',
      startTime: past(48),
      endTime: past(46),
      capacity: 100,
      status: 'past',
    },
  ]);

  const seededEvents = eventRepo.getAll();
  if (seededEvents.length > 0) {
    const firstEventId = seededEvents[0].id;
    rsvpRepo.seed([
      { eventId: firstEventId, userId: 'user-1', displayName: 'Alice', status: 'attending' },
      { eventId: firstEventId, userId: 'user-2', displayName: 'Bob', status: 'waitlisted' },
      { eventId: firstEventId, userId: 'user-3', displayName: 'Carol', status: 'cancelled' },
    ]);
  }

  archiveService.transitionExpired();
  setInterval(() => archiveService.transitionExpired(), 60_000);

  // ── Comment wiring ────────────────────────────────────────────────
  const commentRepo = createInMemoryCommentRepository();
  const commentService = new CommentService(
    commentRepo,
    async (eventId) => {
      const event = await eventRepo.findById(eventId);
      return event
        ? { ok: true as const, value: event as any }
        : { ok: true as const, value: null };
    }
  );
  const commentController = CreateCommentController(commentService, resolvedLogger);

  // ── RSVP / Waitlist wiring (Prisma) ───────────────────────────────
  const rsvpService = new EventService(prisma);
  const rsvpController = CreateRsvpController(rsvpService, resolvedLogger);

  // ── Dashboard wiring (Prisma) ─────────────────────────────────────
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