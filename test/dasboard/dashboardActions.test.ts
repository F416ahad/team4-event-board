import { InMemoryRepository } from "../src/rsvp/InMemoryRepository";
import { EventService } from "../src/rsvp/waitlistService";
import type { Role } from "../src/auth/types";

let repo: InMemoryRepository;
let service: EventService;

beforeEach(() => {
  repo = new InMemoryRepository();
  service = new EventService(repo);
});