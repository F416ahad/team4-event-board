// custom errors for rsvp feature

export class EventNotFoundError extends Error {
  constructor() { super("Event not found"); }
}

export class EventCancelledError extends Error {
  constructor() { super("Cannot RSVP to a cancelled event"); }
}

export class EventPastError extends Error {
  constructor() { super("Cannot RSVP to a past event"); }
}

export class EventFullError extends Error {
  constructor() { super("Event has reached capacity"); }
}

// generic failure (unexpected)
export class RsvpToggleFailedError extends Error {
  constructor() { super("Failed to toggle RSVP"); }
}