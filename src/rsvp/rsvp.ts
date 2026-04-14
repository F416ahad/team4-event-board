export type rsvpStatus = "going" | "waitlisted" | "cancelled"

// rsvp object (single user's response)
export type rsvp = {
    userId: string;
    status: rsvpStatus;
}

