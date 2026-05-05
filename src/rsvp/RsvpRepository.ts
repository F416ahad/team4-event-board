import type { Event, RSVPStatus, RSVP} from "./rsvp.ts" // import Rsvp.ts from current directory
import type { Result } from "../lib/result"; // import result type

export interface RSVPRepository {
    // Event methods
    createEvent(title: string, createdByUserId: string, capacity?: number,
        creator?: { email: string; displayName: string; role: "admin" | "staff" | "user" },): Promise<Result<Event, Error>>;
    getEvent(id: string): Promise<Result<Event | null, Error>>; // return the event or null wrapped in a result
    getEvents(): Promise<Result<Event[], Error>>; // return is array of Event's in a result
    updateEvent(eventId: string,
        updates: {
            title: string;
            capacity?: number;
            date: string;
            status: Event["status"];
        },): Promise<Result<Event | null, Error>>;

    // RSVP methods
    addRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<void, Error>>; // return is void in a result
    getRSVP(eventId: string, userId: string): Promise<Result<RSVP | null, Error>>; // return RSVP object or null in a result
    countGoing(eventId: string): Promise<Result<number, Error>>; // return number in a result
    
    // NEW — get earliest waitlisted RSVP
    getNextWaitlisted(eventId: string): Promise<Result<RSVP | null, Error>>;

    // NEW — update RSVP status (going, waitlisted, cancelled)
    updateRSVP(eventId: string, userId: string, status: RSVPStatus): Promise<Result<RSVP, Error>>;
}