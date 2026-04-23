import { Ok, Err, type Result } from "../lib/result";
import type { RSVPRepository } from "./RsvpRepository";
import type { RSVPStatus, Event, RSVP } from "./rsvp.ts";
// import custom errors
import {
  EventNotFoundError,
  EventCancelledError,
  EventPastError,
  RsvpToggleFailedError,
} from "./errors";

export class RsvpService {
  constructor(private readonly repo: RSVPRepository) {}

  // creates a new RSVP if none exists
  // cancels if already going
  // reactivates if previously cancelled
  // HIGHLIGHT
  async toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<void, Error>> {
    try {
      // Get event from repository
      const eventResult = await this.repo.getEvent(eventId);

      if(!eventResult.ok)
      {
        return Err(eventResult.value as Error); // handle repository error
      }

      const event = eventResult.value;

      if(!event) return Err(new EventNotFoundError()); // check if event exists

      // reject if event is cancelled
      if(event.status === "cancelled") 
      {
        return Err(new EventCancelledError());
    
      }

      // reject if event date is strictly before today (date only)
      const eventDate = new Date(event.date);
      const today = new Date();

      // compare only the date part (YYYY-MM-DD) to ignore time of day
      // reject if event date is in the past
      // 2026-04-16T22:07:52.000Z to 2026-04-16 (10 is exclusive)
      if(eventDate.toISOString().slice(0,10) < today.toISOString().slice(0,10)) 
      {
        return Err(new EventPastError());
      }

      // Get rsvp for user
      const rsvpResult = await this.repo.getRSVP(eventId, userId);

      if(!rsvpResult.ok) 
      {
        return Err(rsvpResult.value as Error); // handle repo error
      }

      const existing = rsvpResult.value;

      // case 1: if user has no rsvp yet, then create one
      if(!existing) 
      {
        const countResult = await this.repo.countGoing(eventId);

        if(!countResult.ok) 
        { // countResult.value is error because ok === false
          return Err(countResult.value as Error); // handle count failure
        }


        let status: RSVPStatus; // create mutable variable

        // check rsvp status based on event capacity
        if(countResult.value >= (event.capacity ?? Infinity))  // if event capacity is null, use infinity
        {
            status = "waitlisted"; // event full
        } 
        else 
        {
            status = "going"; // space available
        }

        // add a new rsvp
        const addResult = await this.repo.addRSVP(eventId, userId, status);

        if(!addResult.ok) 
        {
          return Err(addResult.value as Error); // handle repo error
        }

        return Ok(undefined);
      }

      // HIGHLIGHT THIS
      // case 2/3: check if user already has rsvp and toggle status
      let newStatus: RSVPStatus;

        if(existing.status === "going") 
        { // case 2: user is currently going, cancel their rsvp
            newStatus = "cancelled";
        } 
        else 
        { // case 3: user is currently "waitlisted" or "cancelled", try to become "going"
          // must re-check event capacity because availability may have changed
          const countResult = await this.repo.countGoing(eventId);

        if(!countResult.ok) 
        {
          return Err(countResult.value as Error);
        }
        
        if(countResult.value >= (event.capacity ?? Infinity)) // check if event is full, current going count >= capacity (or infinite if no limit)
        { // still full = remain waitlisted
            newStatus = "waitlisted";
        } 
        else 
        {
          // space available = become going
          newStatus = "going";
        }
      }
      // update rsvp in repo
      const updateResult = await this.repo.addRSVP(eventId, userId, newStatus);

      if(!updateResult.ok) 
      {
        return Err(updateResult.value as Error); // handle update failure
      }

      return Ok(undefined);

    } 
    catch 
    {
      return Err(new RsvpToggleFailedError()); // catch unexpected errors
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
    if(!userId) return Ok(null);
    
    return await this.repo.getRSVP(eventId, userId);
  }

<<<<<<< task/event-comments-structure
  // create event (needs owner id)
  async createEvent(title: string, createdByUserId: string, capacity?: number,): Promise<Result<Event, Error>> {
    const result = await this.repo.createEvent(title, createdByUserId);
=======
  async createEvent(title: string, capacity?: number): Promise<Result<Event, Error>> {
    const result = await this.repo.createEvent(title);
>>>>>>> dev

    if(!result.ok) return result;

    const event = result.value;

    if(capacity !== undefined) 
    {
      event.capacity = capacity;
    }

    return Ok(event);
  }
<<<<<<< task/event-comments-structure

  // count how many "going" for an event
  async countGoing(eventId: string): Promise<Result<number, Error>> 
  {
    return await this.repo.countGoing(eventId);
  }

  // get event owner ID
  async getEventOwnerId(eventId: string): Promise<Result<string | null, Error>> {
        const result = await this.repo.getEvent(eventId);

        if(!result.ok) return Err(result.value as Error);

        let ownerId: string | null;

        if(result.value && result.value.createdByUserId)
        {
            ownerId = result.value.createdByUserId;
        } 
        else 
        {
            ownerId = null;
        }

        return Ok(ownerId);
    }
=======
>>>>>>> dev
}