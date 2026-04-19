// custom errors for rsvp feature

export class EventNotFoundError extends Error {
  constructor() { super("Event not found"); }
}