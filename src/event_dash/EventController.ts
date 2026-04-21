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
    const result = await eventService.getEventDetail(req.params.id, req.session.user);

    if (result.ok && result.value) {
        // simple increment for sprint 2 demo
        result.value.attendeeCount++; 

        // render only the partial, no layout
        res.render('partials/rsvp-status', { 
            event: result.value, 
            layout: false 
        });
    } else {
        res.status(400).send("RSVP failed");
    }
};