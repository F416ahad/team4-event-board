import type { Response } from "express";
import type { IEventService } from "./EventService";
import type { IAppBrowserSession } from "../session/AppSession";

import type { Result } from "../lib/result";
import type { IEventWithStats } from "./Event";

type DashboardGroups = {
  draft: IEventWithStats[];
  published: IEventWithStats[];
  cancelled: IEventWithStats[];
  past: IEventWithStats[];
};

export interface IEventController {
  getDashboardData(
  userId: string,
  role: string
): Promise<Result<DashboardGroups, Error>>;
  showDashboard(
    res: Response,
    session: IAppBrowserSession,
    userId: string,
    role: string
  ): Promise<void>;
}

class EventController implements IEventController {
  constructor(private readonly service: IEventService) {}

  async showDashboard(
    res: Response,
    session: IAppBrowserSession,
    userId: string,
    role: string
  ) {
    const result = await this.service.getDashboardEvents(userId, role);

    if (!result.ok) {
      res.status(500).render("partials/error", {
        message: "Failed to load dashboard",
        layout: false,
      });
      return;
    }

    res.render("events/dashboard", {
      session,
      groups: result.value,
      pageError: null,
    });
  }
  async getDashboardData(userId: string, role: string) {
  return this.service.getDashboardEvents(userId, role);
}
}

export function CreateEventController(service: IEventService): IEventController {
  return new EventController(service);
}
export const handleRSVP = async (req: any, res: any) => {
    const eventId = req.params.id;
    const result = await eventService.getEventDetail(eventId, req.session.user);

    if (result.ok && result.value) {
        // logic
        result.value.attendeeCount++; 
        
        // return a simple success for the route test
        res.status(200).send("RSVP Success");
    } else {
        res.status(400).send("Could not process RSVP");
    }
};