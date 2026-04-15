import { Err, Ok, type Result } from "../lib/result";
import type { Event, RSVPStatus} from "./Rsvp.ts" // import Rsvp.ts from current directory
import type { RSVPRepository } from "./RsvpRepository.ts";

class InMemoryRsvpRepository implements RSVPRepository {
    constructor(private readonly Events: Event[]) {} // Initializes the repository with an in-memory events array

    async createEvent(title: string): Promise<Result<Event, Error>> {
    try {
      // creates an event with unqiue id and empty rsvp list
      const event: Event = { id: Date.now().toString(), title, rsvps: [],};

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

 
}

export function createInMemoryRsvpRepository(): RSVPRepository {
  return new InMemoryRsvpRepository([]);
}
