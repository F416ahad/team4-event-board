export type RSVPStatus = "going" | "waitlisted" | "cancelled"

// rsvp object (single user's response)
export type RSVP = {
    userId: string;
    status: RSVPStatus;
}

// event object
export type Event = {
    id: string;
    title: string;
    rsvps: RSVP[] // store user's responses in array
}