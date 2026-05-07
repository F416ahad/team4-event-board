import type { Response } from "express";
import type { RsvpService } from "./RsvpService";
import type { ILoggingService } from "../service/LoggingService";
import type { IAppBrowserSession } from "../session/AppSession";
import type { UserRole } from "../auth/User";
import type { EventCategory } from "./rsvp";
import { EVENT_CATEGORIES } from "./rsvp";
import { Result } from "../lib/result";

import {
  EventNotFoundError,
  EventCancelledError,
  EventPastError,
  EventEditNotAuthorizedError,
  EventInvalidStateError,
  EventInvalidInputError,
} from "./errors";

export interface CreateEventInputDTO {
  title: string;
  capacity?: number | null;
  category?: EventCategory;
  date?: Date;
  endTime?: Date | null;
}

export interface UpdateEventInputDTO {
  title: string;
  capacity?: number | null;
  date: Date;
  endTime?: Date | null;
  category?: EventCategory;
  status: "active" | "cancelled";
}

export interface IRsvpController {
  toggleRSVP(
    res: Response,
    eventId: string,
    userId: string,
    session: IAppBrowserSession
  ): Promise<void>;
  showEvents(
    res: Response,
    session: IAppBrowserSession,
    currentUserId?: string
  ): Promise<void>;
  showEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    currentUserId?: string
  ): Promise<void>;
  showEditEventForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    actorUserId: string,
    actorRole: UserRole
  ): Promise<void>;
  showCreateEventForm(
    res: Response,
    session: IAppBrowserSession
  ): Promise<void>;
  updateEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    actorUserId: string,
    actorRole: UserRole,
    updates: UpdateEventInputDTO
  ): Promise<void>;
  createEvent(
    res: Response,
    input: CreateEventInputDTO,
    session: IAppBrowserSession,
    userId: string,
    creator: { email: string; displayName: string; role: UserRole }
  ): Promise<void>;
  getEventOwnerId(eventId: string): Promise<Result<string | null, Error>>;
  getUserRsvpStatus(
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void>;
  getAttendeeCount(res: Response, eventId: string): Promise<void>;
  getRsvpButtonPartial(
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void>;
}

class RsvpController implements IRsvpController {
  constructor(
    private readonly service: RsvpService,
    private readonly logger: ILoggingService
  ) {}

  private mapErrorStatus(error: Error): number {
    if (error instanceof EventNotFoundError) return 404;
    if (error instanceof EventCancelledError) return 404;
    if (error instanceof EventPastError) return 400;
    if (error instanceof EventEditNotAuthorizedError) return 403;
    if (error instanceof EventInvalidStateError) return 409;
    if (error instanceof EventInvalidInputError) return 400;
    if (error.message.toLowerCase().includes("full")) return 409;
    if (error.message.toLowerCase().includes("not allowed")) return 403;
    return 500;
  }

  async toggleRSVP(
    res: Response,
    eventId: string,
    userId: string,
    session: IAppBrowserSession
  ): Promise<void> {
    const result = await this.service.toggleRSVP(eventId, userId);

    if (!result.ok) {
      const error = result.value as Error;
      const status = this.mapErrorStatus(error);

      this.logger.warn(`RSVP toggle failed: ${error.message}`);

      res
        .status(status)
        .send(`<div class="error">${error.message}</div>`);
      return;
    }

    const { cancelled, promoted } = result.value;

    if (cancelled) {
      this.logger.info(
        `RSVP cancelled for user=${userId} event=${eventId} (waitlist promotion may follow)`
      );
    } else {
      this.logger.info(`RSVP toggled for user=${userId} event=${eventId}`);
    }

    if (promoted) {
      this.logger.info(
        `Waitlisted user promoted: user=${promoted.userId} event=${eventId}`
      );
    }

    const rsvpResult = await this.service.getUserRsvp(eventId, userId);
    const countResult = await this.service.countGoing(eventId);

    const userStatus = rsvpResult.ok ? rsvpResult.value?.status : null;
    const attendeeCount = countResult.ok ? countResult.value : 0;

    res.render("partials/rsvp-button", {
      eventId,
      userStatus,
      attendeeCount,
      layout: false,
    });
  }

  async showEvents(
    res: Response,
    session: IAppBrowserSession,
    currentUserId?: string
  ): Promise<void> {
    const result = await this.service.listEvents();
    if (!result.ok) {
      const error = result.value as Error;
      this.logger.error(`Failed to list events: ${error.message}`);
      res.status(500).render("events/index", {
        session,
        events: [],
        filters: { category: "all" },
        error: "Unable to load events",
      });
      return;
    }

    res.render("events/index", {
      session,
      events: result.value,
      filters: { category: "all" },
      currentUserId,
      error: null,
    });
  }

  async showEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    currentUserId?: string
  ): Promise<void> {
    const result = await this.service.getEvent(eventId);

    if (!result.ok || !result.value) {
      const errorMsg =
        result.ok === false
          ? (result.value as Error).message
          : "Event not found";
      this.logger.warn(`Event not found: ${eventId}`);
      res.status(404).render("events/show", {
        session,
        event: null,
        userRsvp: null,
        error: errorMsg,
      });
      return;
    }

    const event = result.value;
    const rsvpResult = await this.service.getUserRsvp(eventId, currentUserId);
    const userRsvp = rsvpResult.ok ? rsvpResult.value : null;

    const countResult = await this.service.countGoing(eventId);
    const attendeeCount = countResult.ok ? countResult.value : 0;

    res.render("events/show", {
      session,
      event,
      userRsvp,
      attendeeCount,
      categories: EVENT_CATEGORIES,
      error: null,
    });
  }

  async showCreateEventForm(
    res: Response,
    session: IAppBrowserSession
  ): Promise<void> {
    res.render("events/new", {
      session,
      error: null,
      categories: EVENT_CATEGORIES,
    });
  }

  async showEditEventForm(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    actorUserId: string,
    actorRole: UserRole
  ): Promise<void> {
    const eventResult = await this.service.getEvent(eventId);
    if (!eventResult.ok || !eventResult.value) {
      res.status(404).render("events/show", {
        session,
        event: null,
        userRsvp: null,
        attendeeCount: 0,
        error: "Event not found",
      });
      return;
    }

    const event = eventResult.value;
    const isAdmin = actorRole === "admin";
    const isOwner = event.createdByUserId === actorUserId;

    if (!isAdmin && !isOwner) {
      res.status(403).render("partials/error", {
        message: "Only the organizer or an admin can edit this event",
        layout: false,
      });
      return;
    }

    res.render("events/edit", {
      session,
      event,
      categories: EVENT_CATEGORIES,
      error: null,
    });
  }

  async updateEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession,
    actorUserId: string,
    actorRole: UserRole,
    updates: UpdateEventInputDTO
  ): Promise<void> {
    const result = await this.service.editEvent(
      eventId,
      actorUserId,
      actorRole,
      updates
    );

    if (!result.ok) {
      const error = result.value as Error;
      const status = this.mapErrorStatus(error);
      const eventResult = await this.service.getEvent(eventId);

      res.status(status).render("events/edit", {
        session,
        categories: EVENT_CATEGORIES,
        event:
          eventResult.ok && eventResult.value
            ? eventResult.value
            : {
                id: eventId,
                title: updates.title,
                capacity: updates.capacity ?? null,
                status: updates.status,
                date: updates.date,
                endTime: updates.endTime ?? null,
                category: updates.category ?? "other",
                createdByUserId: actorUserId,
                createdAt: new Date(),
              },
        error: error.message,
      });
      return;
    }

    res.redirect(`/events/${eventId}`);
  }

  async createEvent(
    res: Response,
    input: CreateEventInputDTO,
    session: IAppBrowserSession,
    userId: string,
    creator: { email: string; displayName: string; role: UserRole }
  ): Promise<void> {
    if (!input.title) {
      res.status(400).render("events/new", {
        session,
        error: "Event title is required",
        categories: EVENT_CATEGORIES,
        event: null,
      });
      return;
    }

    const result = await this.service.createEvent({
      title: input.title,
      createdByUserId: userId,
      capacity: input.capacity,
      category: input.category,
      date: input.date,
      endTime: input.endTime,
      creator,
    });

    if (!result.ok) {
      const error = result.value as Error;
      this.logger.error(`Failed to create event: ${error.message}`);
      res.status(400).render("events/new", {
        session,
        error: error.message,
        categories: EVENT_CATEGORIES,
        event: null,
      });
      return;
    }

    this.logger.info(`Event created: ${input.title}`);
    res.redirect("/dashboard");
  }

  async getEventOwnerId(eventId: string): Promise<Result<string | null, Error>> {
    return await this.service.getEventOwnerId(eventId);
  }

  async getUserRsvpStatus(
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void> {
    const result = await this.service.getUserRsvp(eventId, userId);

    if (!result.ok) {
      res
        .status(500)
        .json({ error: (result.value as Error).message });
      return;
    }

    const status = result.value?.status ?? null;
    res.json({ status });
  }

  async getAttendeeCount(
    res: Response,
    eventId: string
  ): Promise<void> {
    const result = await this.service.countGoing(eventId);

    if (!result.ok) {
      res
        .status(500)
        .json({ error: (result.value as Error).message });
      return;
    }

    res.json({ count: result.value });
  }

  async getRsvpButtonPartial(
    res: Response,
    eventId: string,
    userId: string
  ): Promise<void> {
    const rsvpResult = await this.service.getUserRsvp(eventId, userId);
    const countResult = await this.service.countGoing(eventId);

    const userStatus = rsvpResult.ok ? rsvpResult.value?.status : null;
    const attendeeCount = countResult.ok ? countResult.value : 0;

    res.render("partials/rsvp-button", {
      eventId,
      userStatus,
      attendeeCount,
      layout: false,
    });
  }
}

export function CreateRsvpController(
  service: RsvpService,
  logger: ILoggingService
): IRsvpController {
  return new RsvpController(service, logger);
}
