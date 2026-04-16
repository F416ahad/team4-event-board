import { Ok, type Result } from "../lib/result";
import type { IEventRepository } from "./InMemoryEventRepository";
import type { IEvent, IEventWithStats } from "./Event";

export interface IEventService {
  getDashboardEvents(userId: string, role: string): Promise<
    Result<{
      draft: IEventWithStats[];
      published: IEventWithStats[];
      cancelled: IEventWithStats[];
      past: IEventWithStats[];
    }, Error>
  >;
}

class EventService implements IEventService {
  constructor(private readonly events: IEventRepository) {}

  async getDashboardEvents(userId: string, role: string) {
    const result = await this.events.listEvents();
    if (!result.ok) {
      return result as Result<{
        draft: IEventWithStats[];
        published: IEventWithStats[];
        cancelled: IEventWithStats[];
        past: IEventWithStats[];
      }, Error>;
    }

    const accessibleEvents =
      role === "admin"
        ? result.value
        : result.value.filter((event) => event.organizerId === userId);

    const mapEventToStats = (event: IEvent): IEventWithStats => ({
      ...event,
      attendingCount: 0,
    });

    const dashboardGroups = {
      draft: [] as IEventWithStats[],
      published: [] as IEventWithStats[],
      cancelled: [] as IEventWithStats[],
      past: [] as IEventWithStats[],
    };

    for (const event of accessibleEvents) {
      dashboardGroups[event.status].push(mapEventToStats(event));
    }

    return Ok(dashboardGroups);
  }
}

export function CreateEventService(events: IEventRepository): IEventService {
  return new EventService(events);
}
