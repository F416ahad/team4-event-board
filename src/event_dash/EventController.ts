import type { Response } from "express";
import type { IAppBrowserSession } from "../session/AppSession";
import type { DashboardService } from "./EventService";
import type { ILoggingService } from "../service/LoggingService";

export interface IDashboardController {
  showDashboard(
    res: Response,
    session: IAppBrowserSession
  ): Promise<void>;
  publishEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession
  ): Promise<void>;
  cancelEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession
  ): Promise<void>;
}

export class DashboardController implements IDashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly logger: ILoggingService
  ) {}

  /**
   * Main dashboard route:
   * - role-based filtering via service
   * - grouping for UI sections
   * - supports HTMX partial rendering
   */
  async showDashboard(res: Response, session: IAppBrowserSession): Promise<void> {
  try {
    const auth = session.authenticatedUser;

    if (!auth) {
      res.status(403).render("errors/403", {
        session,
        error: "Not authenticated",
      });
      return;
    }

    const userId = auth.userId;
    const role = auth.role;

    const events = await this.service.getDashboard(userId, role);
    const grouped = this.service.groupByStatus(events);

    const isHxRequest = res.req.headers["hx-request"] === "true";

    if (isHxRequest) {
      res.status(200).render("dashboard/_dashboard", {
        session,
        grouped,
      });
      return;
    }

    res.status(200).render("dashboard/index", {
      session,
      grouped,
    });
  } catch (error) {
    this.logger.error(
      `Dashboard load failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );

    res.status(403).render("errors/403", {
      session,
      error: "You are not allowed to access this dashboard",
    });
  }}
  async publishEvent(
    res: Response,
    eventId: string,
    session: IAppBrowserSession
  ): Promise<void> {
    const auth = session.authenticatedUser;
    if (!auth) {
      res.status(403).send("Forbidden");
      return;
    }
    try {
      await this.service.updateEventStatus(
        eventId,
        auth.userId,
        auth.role,
        "PUBLISHED"
      );
      const updated = await this.service.getEventForDashboard(eventId);
      res.status(200).render("dashboard/_event-row", {
        event: updated,
        session,
      });
      } catch (err) {
        res.status(403).send("Forbidden");
    }
    }

    async cancelEvent(
      res: Response,
      eventId: string,
      session: IAppBrowserSession
    ): Promise<void> {
      const auth = session.authenticatedUser;
      if (!auth) {
        res.status(403).send("Forbidden");
        return;
      }
      try {
        await this.service.updateEventStatus(
          eventId,
          auth.userId,
          auth.role,
          "CANCELLED"
        );
        const updated = await this.service.getEventForDashboard(eventId);
        res.status(200).render("dashboard/_event-row", {
          event: updated,
          session,
        });
      } catch (err) {
        res.status(403).send("Forbidden");
      }
  }
}
export function CreateDashboardController(
  service: DashboardService,
  logger: ILoggingService

): IDashboardController {
  return new DashboardController(service, logger);
}