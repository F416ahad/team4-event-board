import { CommentService } from "../../src/comment/CommentService";
import { createInMemoryCommentRepository } from "../../src/comment/InMemoryCommentRepository";
import { createInMemoryRsvpRepository } from "../../src/rsvp/InMemoryRsvpRepository";
import {
  CommentEmptyError,
  CommentTooLongError,
  UnauthorizedDeleteError,
} from "../../src/comment/errors";

// import types for casting
import type { Comment } from "../../src/comment/Comment";
import type { Event } from "../../src/rsvp/rsvp";

describe("CommentService - Sprint 2", () => {
  let commentRepo: ReturnType<typeof createInMemoryCommentRepository>;
  let rsvpRepo: ReturnType<typeof createInMemoryRsvpRepository>;
  let service: CommentService;
  let eventId: string;
  let commentId: string;

  beforeEach(async () => {
    commentRepo = createInMemoryCommentRepository();
    rsvpRepo = createInMemoryRsvpRepository();
    // helper to get event by id
    const getEventById = async (id: string) => await rsvpRepo.getEvent(id);
    service = new CommentService(commentRepo, getEventById);

    // create an event
    const eventResult = await rsvpRepo.createEvent("Test Event", "owner1");

    // check success and cast to Event
    expect(eventResult.ok).toBe(true);
    const event = eventResult.value as Event;
    eventId = event.id;
  });

  
});