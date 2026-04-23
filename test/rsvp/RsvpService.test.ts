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

  test("new RSVP when capacity available becomes 'going'", async () => {
    const result = await service.toggleRSVP(eventId, "user1");
    expect(result.ok).toBe(true);

    const rsvpResult = await repo.getRSVP(eventId, "user1");
    expect(rsvpResult.ok).toBe(true);

    // assert the value is RSVP (not null/undefined)
    const rsvp = rsvpResult.value as RSVP;
    expect(rsvp.status).toBe("going");
  });

  test("new RSVP when capacity full becomes 'waitlisted'", async () => {
    const eventResult = await repo.getEvent(eventId);
    expect(eventResult.ok).toBe(true);

    const event = eventResult.value as Event;
    event.capacity = 1;

    await service.toggleRSVP(eventId, "user1");
    const result = await service.toggleRSVP(eventId, "user2");
    expect(result.ok).toBe(true);

    const rsvpResult = await repo.getRSVP(eventId, "user2");
    expect(rsvpResult.ok).toBe(true);

    const rsvp = rsvpResult.value as RSVP;
    expect(rsvp.status).toBe("waitlisted");
  });

  test("cancelling a 'going' RSVP", async () => {
    await service.toggleRSVP(eventId, "user1");

    const cancelResult = await service.toggleRSVP(eventId, "user1");
    expect(cancelResult.ok).toBe(true);

    const rsvpResult = await repo.getRSVP(eventId, "user1");
    expect(rsvpResult.ok).toBe(true);

    const rsvp = rsvpResult.value as RSVP;
    expect(rsvp.status).toBe("cancelled");
  });

  test("reactivating a cancelled RSVP when space available", async () => {
    await service.toggleRSVP(eventId, "user1");
    await service.toggleRSVP(eventId, "user1"); // cancel

    const reactivate = await service.toggleRSVP(eventId, "user1");
    expect(reactivate.ok).toBe(true);

    const rsvpResult = await repo.getRSVP(eventId, "user1");
    expect(rsvpResult.ok).toBe(true);

    const rsvp = rsvpResult.value as RSVP;
    expect(rsvp.status).toBe("going");
  });

  test("waitlisted user stays waitlisted if still full", async () => {
    const eventResult = await repo.getEvent(eventId);
    expect(eventResult.ok).toBe(true);

    const event = eventResult.value as Event;
    event.capacity = 1;

    await service.toggleRSVP(eventId, "user1");
    await service.toggleRSVP(eventId, "user2"); // becomes waitlisted

    const result = await service.toggleRSVP(eventId, "user2");
    expect(result.ok).toBe(true);

    const rsvpResult = await repo.getRSVP(eventId, "user2");
    expect(rsvpResult.ok).toBe(true);

    const rsvp = rsvpResult.value as RSVP;
    expect(rsvp.status).toBe("waitlisted");
  });

  test("rejects RSVP to cancelled event", async () => {
    const eventResult = await repo.getEvent(eventId);
    expect(eventResult.ok).toBe(true);

    const event = eventResult.value as Event;
    event.status = "cancelled";

    const result = await service.toggleRSVP(eventId, "user1");
    expect(result.ok).toBe(false);

    // error type is already narrow enough – no cast needed
    expect(result.value).toBeInstanceOf(EventCancelledError);
  });

  test("rejects RSVP to past event", async () => {
    const eventResult = await repo.getEvent(eventId);
    expect(eventResult.ok).toBe(true);

    const event = eventResult.value as Event;
    event.date = "2020-01-01T00:00:00Z";

    const result = await service.toggleRSVP(eventId, "user1");
    expect(result.ok).toBe(false);
    
    expect(result.value).toBeInstanceOf(EventPastError);
  });
});