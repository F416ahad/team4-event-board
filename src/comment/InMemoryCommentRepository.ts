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

    async getEvents(): Promise<Result<Event[], Error>> {
        try {
            return Ok([...this.events]);
        } 
        catch 
        {
            return Err(new Error("Unable to get events"));
        }
    }
    
    async addRSVP(
        eventId: string,
        userId: string,
        status: RSVPStatus
    ): Promise<Result<void, Error>> {
        try {
            const event = this.events.find(e => e.id === eventId);

            if(!event) return Err(new Error("Event not found"));

            const existing = event.rsvps.find((r: { userId: string; }) => r.userId === userId);
            
            if(existing) 
            {
                existing.status = status;
            } 
            else 
            {
                event.rsvps.push({ userId, status });
            }
            return Ok(undefined);

        } 
        catch 
        {
            return Err(new Error("Unable to add RSVP"));
        }
    }

    async getRSVP(eventId: string, userId: string): Promise<Result<RSVP | null, Error>> {
        try {
            const event = this.events.find(e => e.id === eventId);

            if(!event) return Ok(null);

            const rsvp = event.rsvps.find((r: { userId: string; }) => r.userId === userId) ?? null;

            return Ok(rsvp);
        } 
        catch 
        {
            return Err(new Error("Unable to get RSVP"));
        }
    }

    async countGoing(eventId: string): Promise<Result<number, Error>> {
        try {
            const event = this.events.find(e => e.id === eventId);

            if(!event) return Ok(0);

            const count = event.rsvps.filter((r: { status: string; }) => r.status === "going").length;
            return Ok(count);
        } 
        catch 
        {
            return Err(new Error("Unable to count RSVPs"));
        }
    }
}

export function createInMemoryRsvpRepository(): RSVPRepository {
    return new InMemoryRsvpRepository();
}