import { RsvpService } from "../../src/rsvp/RsvpService";
import { createInMemoryRsvpRepository } from "../../src/rsvp/InMemoryRsvpRepository";
import {
  EventNotFoundError,
  EventCancelledError,
  EventPastError,
} from "../../src/rsvp/errors";

// import the actual types for casting
import type { Event, RSVP } from "../../src/rsvp/rsvp";

describe("RsvpService - Sprint 2", () => {
  let repo: ReturnType<typeof createInMemoryRsvpRepository>;
  let service: RsvpService;
  let eventId: string;

  beforeEach(async () => {
    repo = createInMemoryRsvpRepository();
    service = new RsvpService(repo);

    const createResult = await repo.createEvent("Test Event", "organizer1");
    expect(createResult.ok).toBe(true);

    // after checking .ok, assert the value is Event (not Error)
    const event = createResult.value as Event;
    eventId = event.id;
  });


});