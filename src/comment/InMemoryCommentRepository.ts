import { randomUUID } from "node:crypto"; // for generating unique IDs
import { Err, Ok, type Result } from "../lib/result";
import type { Event, RSVP, RSVPStatus } from "./Rsvp.ts";
import type { RSVPRepository } from "./RsvpRepository.ts";

class InMemoryRsvpRepository implements RSVPRepository {
    private events: Event[] = [];

    async createEvent(title: string, createdByUserId: string): Promise<Result<Event, Error>> {
        try {
            const event: Event = {
                id: randomUUID(),
                title,
                rsvps: [],
                status: "active",
                date: new Date().toISOString(),
                createdByUserId,
            };
            this.events.push(event);

            return Ok(event);
        } 
        catch 
        {
            return Err(new Error("Unable to create event"));
        }
    }

    async getEvent(id: string): Promise<Result<Event | null, Error>> {
        try {
            const event = this.events.find(e => e.id === id) ?? null;

            return Ok(event);
        } 
        catch 
        {
            return Err(new Error("Unable to get event"));
        }
    }

}