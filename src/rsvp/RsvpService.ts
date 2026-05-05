import { Ok, Err, type Result } from "../lib/result";
import type { RSVPRepository } from "./RsvpRepository";
import type { RSVPStatus, Event, RSVP } from "./rsvp.ts";
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
   * toggleRSVP now returns:
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

      // Past event check
      const eventDate = new Date(event.date);
      const today = new Date();
      if (eventDate.toISOString().slice(0, 10) < today.toISOString().slice(0, 10)) {
        return Err(new EventPastError());
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

  // create event
  async createEvent(
    title: string,
    createdByUserId: string,
    capacity?: number,
    creator?: { email: string; displayName: string; role: UserRole },
  ): Promise<Result<Event, Error>> {
    return await this.repo.createEvent(title, createdByUserId, capacity, creator);
  }

  async editEvent(
    eventId: string,
    actorUserId: string,
    actorRole: UserRole,
    updates: { title: string; capacity?: number; date: string; status: Event["status"] },
  ): Promise<Result<Event, Error>> {
    const eventResult = await this.repo.getEvent(eventId);
    if (!eventResult.ok) return Err(eventResult.value as Error);

    const event = eventResult.value;
    if (!event) return Err(new EventNotFoundError());

    const isAdmin = actorRole === "admin";
    const isOwner = event.createdByUserId === actorUserId;
    if (!isAdmin && !isOwner) return Err(new EventEditNotAuthorizedError());

    const eventDate = new Date(event.date);
    if (event.status === "cancelled" || eventDate.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
      return Err(new EventInvalidStateError());
    }

    const title = updates.title.trim();
    if (!title) return Err(new EventInvalidInputError("Event title is required"));
    if (updates.capacity !== undefined && updates.capacity < 1) {
      return Err(new EventInvalidInputError("Capacity must be at least 1"));
    }
    if (Number.isNaN(new Date(updates.date).getTime())) {
      return Err(new EventInvalidInputError("Event date is invalid"));
    }

    const updateResult = await this.repo.updateEvent(eventId, {
      title,
      capacity: updates.capacity,
      date: updates.date,
      status: updates.status,
    });
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
