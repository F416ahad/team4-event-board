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

      
  }
}