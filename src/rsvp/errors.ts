// custom errors for rsvp feature

export class EventNotFoundError extends Error {
  constructor() { super("Event not found"); }
}

export class EventCancelledError extends Error {
  constructor() { super("Cannot RSVP to a cancelled event"); }
}