import { Ok, Err, type Result } from "../lib/result";
import type { RSVPRepository } from "./RsvpRepository";
import type { RSVPStatus } from "./Rsvp";

export class RsvpService {
  constructor(private readonly repo: RSVPRepository) {}

  // creates a new RSVP if none exists
  // cancels if already going
  // reactivates if previously cancelled
  async toggleRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<void, Error>> {
    try {
      // Get event from repository
      const eventResult = await this.repo.getEvent(eventId);

      if(!eventResult.ok)
      {
        return Err(eventResult.value); // handle repository error
      }

      const event = eventResult.value;

      if(!event) return Err(new Error("Event not found")); // check if event exists

      // Get rsvp for user
      const rsvpResult = await this.repo.getRSVP(eventId, userId);

      if(!rsvpResult.ok) 
      {
        return Err(rsvpResult.value); // handle repo error
      }

      const existing = rsvpResult.value;

      // if user has no rsvp yet, then create one
      if(!existing) 
      {
        const countResult = await this.repo.countGoing(eventId);

        if(!countResult.ok) 
        {
          return Err(countResult.value); // handle count failure
        }


        let status: RSVPStatus; // create mutable variable

        // check rsvp status based on event capacity
        if(countResult.value >= (event.capacity ?? Infinity))  // if event capacity is null, use infinity
        {
            status = "waitlisted";
        } 
        else 
        {
            status = "going";
        }

        // add a new rsvp
        const addResult = await this.repo.addRSVP(
          eventId,
          userId,
          status
        );

        if(!addResult.ok) 
        {
          return Err(addResult.value); // handle repo error
        }

        return Ok(undefined);
      }

      // check if user already has rsvp and toggle status
      let newStatus: RSVPStatus;

        if(existing.status === "going") 
        {
            newStatus = "cancelled";
        } 
        else 
        {
            newStatus = "going";
        }

      // update rsvp in repo
      const updateResult = await this.repo.addRSVP(
        eventId,
        userId,
        newStatus
      );

      if(!updateResult.ok) 
      {
        return Err(updateResult.value); // handle update failure
      }

      return Ok(undefined);

    } 
    catch 
    {
      return Err(new Error("Failed to toggle RSVP")); // catch unexpected errors
    }
  }
}