import { Err, Ok, type Result } from "../lib/result";
import type { Event, RSVP, RSVPStatus} from "./Rsvp.ts" // import Rsvp.ts from current directory
import type { RSVPRepository } from "./RsvpRepository.ts";

class InMemoryRsvpRepository implements RSVPRepository {
    constructor(private readonly Events: Event[]) {} // Initializes the repository with an in-memory events array

  async createEvent(title: string, createdByUserId: string): Promise<Result<Event, Error>> {
    try {
      // creates an event with unqiue id and empty rsvp list
      const event: Event = { id: Date.now().toString(), title, rsvps: [], createdByUserId, status: "active", date: new Date().toISOString()};

      this.Events.push(event); // Stores the new event in memory

      return Ok(event); // returns created event in a result
    } 
    catch { 
      return Err(new Error("Unable to create event")); // returns an error message if creation fails
    }
  }

  async getEvent(id: string): Promise<Result<Event | null, Error>> {
    try {
      // search in-memory array for matching event id
      const event = this.Events.find(e => e.id === id) ?? null; // find event with given id, if can't, return null 
      // wrap and return result in result type (event or null)
      return Ok(event);
    } 
    catch { 
      return Err(new Error("Unable to get event")); // return error message
    }
  }

  async getEvents(): Promise<Result<Event[], Error>> {
    try {
      return Ok(Array.from(this.Events)); // returns a shallow copy of in-memory array
    } catch {
      return Err(new Error("Unable to get events")); // return error message
    }
  }

  async addRSVP(
    eventId: string,
    userId: string,
    status: RSVPStatus
  ): Promise<Result<void, Error>> {
    try {
      const event = this.Events.find(e => e.id === eventId); // find event by id
      if(!event) return Err(new Error("Event not found")); // if no event exists, return error result

      const existing = event.rsvps.find(r => r.userId === userId); // check if user already rsvp for event

      if(existing) 
      {
        existing.status = status; // if rsvp exists, update status
      } 
      else 
      {
        event.rsvps.push({ userId, status }); // create new rsvp entry
      }

      return Ok(undefined); // return success (void)
    } 
    catch {
      return Err(new Error("Unable to add RSVP")); // catch any unexpected errors
    }
  }
 
  async getRSVP(
    eventId: string,
    userId: string
  ): Promise<Result<RSVP | null, Error>> {
    try {
      const event = this.Events.find(e => e.id === eventId); // find event by id

      if(!event) return Ok(null); // if event doesn't exist, return null

      // find rsvp for given user within event's rsvp list and return if user rsvp'ed or null
      const rsvp = event.rsvps.find(r => r.userId === userId) ?? null; 

      return Ok(rsvp); // return rsvp or null
    } 
    catch {
      return Err(new Error("Unable to get RSVP")); // unexpected errors
    }
  }

   async countGoing(eventId: string): Promise<Result<number, Error>> {
    try {
      const event = this.Events.find(e => e.id === eventId); // find event by id

      if(!event) return Ok(0); // if event doesn't exist, return 0 (no rsvps)

      const count = event.rsvps.filter(r => r.status === "going").length; // filter rsvps to only those going and count how many
      
      return Ok(count); // return count as result

    } 
    catch {
      return Err(new Error("Unable to count RSVPs")); // unexpected errors
    }
  }

}


export function createInMemoryRsvpRepository(): RSVPRepository { 
  return new InMemoryRsvpRepository([]); // initializes repository with empty list
}
