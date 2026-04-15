import { Ok, type Result } from "../lib/result";
import type { IEvent } from "./Event";

export const DEMO_EVENTS: IEvent[] = [
  {
    id: "event-1",
    title: "Hackathon",
    date: new Date(),
    category: "Tech",
    capacity: 10,
    organizerId: "user-staff",
    status: "published",
  },
  {
    id: "event-2",
    title: "Music Night",
    date: new Date(),
    category: "Music",
    capacity: 5,
    organizerId: "user-staff",
    status: "draft",
  },
];

export interface IEventRepository {
  listEvents(): Promise<Result<IEvent[], Error>>;
}

class InMemoryEventRepository implements IEventRepository {
  constructor(private events: IEvent[]) {}

  async listEvents(): Promise<Result<IEvent[], Error>> {
    return Ok([...this.events]);
  }
}

export function CreateInMemoryEventRepository(): IEventRepository {
  return new InMemoryEventRepository([...DEMO_EVENTS]);
}