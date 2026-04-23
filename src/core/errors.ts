export class DomainError extends Error {
  constructor(public message: string, public status: number) {
    super(message);
  }
}


export class EventNotFoundError extends DomainError {
  constructor() {
    super("The requested event could not be found.", 404);
  }
}


export class UnauthorizedError extends DomainError {
  constructor() {
    super("You do not have permission to view this event.", 403);
  }
}