import { Ok, Err, type Result } from "../lib/result";
import type { CreateEventFields, RSVPRepository, UpdateEventFields } from "./RsvpRepository";
import type { RSVPStatus, Event, RSVP, EventCategory } from "./rsvp";
import type { UserRole } from "../auth/User";

import {
  EventNotFoundError,
  EventCancelledError,
  EventPastError,
  EventEditNotAuthorizedError,
  EventInvalidStateError,
  EventInvalidInputError,
  RsvpToggleFailedError,
} from "./errors";

export class RsvpService {
  constructor(private readonly repo: RSVPRepository) {}

  /**
   * FEATURE 9 — Waitlist Promotion
   * toggleRSVP returns:
   * { cancelled: RSVP | null, promoted: RSVP | null }
   */
  async toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<{ cancelled: RSVP | null; promoted: RSVP | null }, Error>> {
    try {
      // 1. Load event
      const eventResult = await this.repo.getEvent(eventId);
      if (!eventResult.ok) return Err(eventResult.value as Error);

      const event = eventResult.value;
      if (!event) return Err(new EventNotFoundError());
      if (event.status === "cancelled") return Err(new EventCancelledError());
      if (event.status === "past") return Err(new EventPastError());

      // Auto-archive transition runs every 60s; until then, fall back to
      // explicit time checks so toggleRSVP can't accept ended events.
      const eventEnd = event.endTime
        ? event.endTime instanceof Date
          ? event.endTime
          : new Date(event.endTime)
        : null;
      if (eventEnd && eventEnd.getTime() < Date.now()) {
        return Err(new EventPastError());
      }

      // If no endTime is set, fall back to a same-day comparison
      // (matches the original behaviour: same-day events are still RSVP-able).
      if (!eventEnd) {
        const eventDate = event.date instanceof Date ? event.date : new Date(event.date);
        const eventDay = eventDate.toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        if (eventDay < today) return Err(new EventPastError());
      }

      // 2. Load existing RSVP
      const rsvpResult = await this.repo.getRSVP(eventId, userId);
      if (!rsvpResult.ok) return Err(rsvpResult.value as Error);

      const existing = rsvpResult.value;

      // 3. CASE 1 — No RSVP yet → create one
      if (!existing) {
        const countResult = await this.repo.countGoing(eventId);
        if (!countResult.ok) return Err(countResult.value as Error);

        const status: RSVPStatus =
          countResult.value >= (event.capacity ?? Infinity)
            ? "waitlisted"
            : "going";

        const addResult = await this.repo.addRSVP(eventId, userId, status);
        if (!addResult.ok) return Err(addResult.value as Error);

        return Ok({ cancelled: null, promoted: null });
      }

      // 4. CASE 2 — User is going → cancel + promote next waitlisted
      if (existing.status === "going") {
        const cancelResult = await this.repo.updateRSVP(eventId, userId, "cancelled");
        if (!cancelResult.ok) return Err(cancelResult.value as Error);

        const cancelled = cancelResult.value;

        // Find next waitlisted
        const nextResult = await this.repo.getNextWaitlisted(eventId);
        if (!nextResult.ok) return Err(nextResult.value as Error);

        const next = nextResult.value;
        if (!next) {
          return Ok({ cancelled, promoted: null });
        }

        // Promote them
        const promoteResult = await this.repo.updateRSVP(eventId, next.userId, "going");
        if (!promoteResult.ok) return Err(promoteResult.value as Error);

        const promoted = promoteResult.value;

        return Ok({ cancelled, promoted });
      }

      // 5. CASE 3 — User is waitlisted or cancelled → try to become going
      const countResult = await this.repo.countGoing(eventId);
      if (!countResult.ok) return Err(countResult.value as Error);

      const newStatus: RSVPStatus =
        countResult.value >= (event.capacity ?? Infinity)
          ? "waitlisted"
          : "going";

      const updateResult = await this.repo.updateRSVP(eventId, userId, newStatus);
      if (!updateResult.ok) return Err(updateResult.value as Error);

      return Ok({ cancelled: null, promoted: null });
    } catch {
      return Err(new RsvpToggleFailedError());
    }
  }

  // list all events
  async listEvents(): Promise<Result<Event[], Error>> {
    return await this.repo.getEvents();
  }

  // get single event by id
  async getEvent(eventId: string): Promise<Result<Event | null, Error>> {
    return await this.repo.getEvent(eventId);
  }

  // get a user's rsvp for an event
  async getUserRsvp(eventId: string, userId?: string): Promise<Result<RSVP | null, Error>> {
    if (!userId) return Ok(null);
    return await this.repo.getRSVP(eventId, userId);
  }

  /**
   * Create a new event. The form supplies title + category + start date (and optionally
   * end time and capacity). The creator user is upserted by the repo so RSVPs can FK
   * back to a real user row.
   */
  async createEvent(
    input: {
      title: string;
      createdByUserId: string;
      capacity?: number | null;
      category?: EventCategory;
      date?: Date;
      endTime?: Date | null;
      creator?: { email: string; displayName: string; role: UserRole };
    },
  ): Promise<Result<Event, Error>> {
    const title = input.title.trim();
    if (!title) return Err(new EventInvalidInputError("Event title is required"));

    if (input.capacity != null && input.capacity < 1) {
      return Err(new EventInvalidInputError("Capacity must be at least 1"));
    }

    if (input.date && Number.isNaN(input.date.getTime())) {
      return Err(new EventInvalidInputError("Event start time is invalid"));
    }

    if (input.endTime && Number.isNaN(input.endTime.getTime())) {
      return Err(new EventInvalidInputError("Event end time is invalid"));
    }

    if (input.date && input.endTime && input.endTime.getTime() <= input.date.getTime()) {
      return Err(new EventInvalidInputError("End time must be after the start time"));
    }

    const fields: CreateEventFields = {
      title,
      createdByUserId: input.createdByUserId,
      capacity: input.capacity ?? null,
      category: input.category ?? "other",
      date: input.date,
      endTime: input.endTime ?? null,
      creator: input.creator,
    };

    return await this.repo.createEvent(fields);
  }

  async editEvent(
    eventId: string,
    actorUserId: string,
    actorRole: UserRole,
    updates: {
      title: string;
      capacity?: number | null;
      date: Date;
      endTime?: Date | null;
      category?: EventCategory;
      status: Event["status"];
    },
  ): Promise<Result<Event, Error>> {
    const eventResult = await this.repo.getEvent(eventId);
    if (!eventResult.ok) return Err(eventResult.value as Error);

    const event = eventResult.value;
    if (!event) return Err(new EventNotFoundError());

    const isAdmin = actorRole === "admin";
    const isOwner = event.createdByUserId === actorUserId;
    if (!isAdmin && !isOwner) return Err(new EventEditNotAuthorizedError());

    if (event.status === "past") return Err(new EventInvalidStateError());

    const title = updates.title.trim();
    if (!title) return Err(new EventInvalidInputError("Event title is required"));
    if (updates.capacity != null && updates.capacity < 1) {
      return Err(new EventInvalidInputError("Capacity must be at least 1"));
    }
    if (Number.isNaN(updates.date.getTime())) {
      return Err(new EventInvalidInputError("Event date is invalid"));
    }
    if (updates.endTime && Number.isNaN(updates.endTime.getTime())) {
      return Err(new EventInvalidInputError("Event end time is invalid"));
    }
    if (updates.endTime && updates.endTime.getTime() <= updates.date.getTime()) {
      return Err(new EventInvalidInputError("End time must be after the start time"));
    }

    const fields: UpdateEventFields = {
      title,
      capacity: updates.capacity ?? null,
      date: updates.date,
      endTime: updates.endTime ?? null,
      category: updates.category,
      status: updates.status,
    };

    const updateResult = await this.repo.updateEvent(eventId, fields);
    if (!updateResult.ok) return Err(updateResult.value as Error);
    if (!updateResult.value) return Err(new EventNotFoundError());
    return Ok(updateResult.value);
  }

  async countGoing(eventId: string): Promise<Result<number, Error>> {
    return await this.repo.countGoing(eventId);
  }

  async getEventOwnerId(eventId: string): Promise<Result<string | null, Error>> {
    const result = await this.repo.getEvent(eventId);
    if (!result.ok) return Err(result.value as Error);

    return Ok(result.value?.createdByUserId ?? null);
  }
}
