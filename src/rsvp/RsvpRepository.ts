import type { Event, RSVPStatus, RSVP} from "./Rsvp.ts" // import Rsvp.ts from current directory

export interface RSVPRepository {
    // Event methods
    createEvent(title: string): Event;
    getEvent(id: string): Event | null; // return is Event object or null
    getEvents(): Event[]; // return is array of Event's

    // RSVP methods
    addRSVP(eventId: string, userId: string, status: RSVPStatus): void; // return is void
    getRSVP(eventId: string, userId: string): RSVP | null; // return RSVP object or null
    countGoing(eventId: string): number; // return number
}