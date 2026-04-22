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

export function createComposedApp(logger?: ILoggingService): IApp {
  const resolvedLogger = logger ?? CreateLoggingService();

  // Authentication & authorization wiring
  const authUsers = CreateInMemoryUserRepository();
  const passwordHasher = CreatePasswordHasher();
  const authService = CreateAuthService(authUsers, passwordHasher);
  const adminUserService = CreateAdminUserService(authUsers, passwordHasher);
  const authController = CreateAuthController(authService, adminUserService, resolvedLogger);

  // Events wiring
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
      id: ""
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
      id: ""
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
      id: ""
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

  // Transition expired events on startup, then every 60 seconds
  archiveService.transitionExpired();
  setInterval(() => archiveService.transitionExpired(), 60_000);

  return CreateApp(authController, archiveController, attendeeController, resolvedLogger);
}