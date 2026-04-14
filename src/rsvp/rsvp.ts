export type RSVPStatus = "going" | "waitlisted" | "cancelled"

// rsvp object (single user's response)
export interface RSVP {
    userId: string;
    status: RSVPStatus;
}

// event object
export interface Event {
    id: string;
    title: string;
    rsvps: RSVP[] // store user's responses in array
}