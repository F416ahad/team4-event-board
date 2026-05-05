import "dotenv/config";
import path from "node:path";
import express, { Request, RequestHandler, Response } from "express";
import session from "express-session";
import Layouts from "express-ejs-layouts";
import { IAuthController } from "./auth/AuthController";
import { AuthenticationRequired, AuthorizationRequired } from "./auth/errors";
import type { UserRole } from "./auth/User";
import { IApp } from "./contracts";
import {
  getAuthenticatedUser,
  isAuthenticatedSession,
  AppSessionStore,
  recordPageView,
  touchAppSession,
} from "./session/AppSession";
import { ILoggingService } from "./service/LoggingService";
import { IArchiveController } from "./events/ArchiveController";
import { IAttendeeController } from "./events/AttendeeController";
import { IRsvpController } from "./rsvp/RsvpController";
import { ICommentController } from "./comment/CommentController";
import { IDashboardController } from "./event_dash/EventController";
import { EventSearchController } from "./events/EventSearchController";
import { SavedEventController } from "./savedEvents/SavedEventController";

type AsyncRequestHandler = RequestHandler;

function asyncHandler(fn: AsyncRequestHandler) {
  return function wrapped(req: Request, res: Response, next: (value?: unknown) => void) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sessionStore(req: Request): AppSessionStore {
  return req.session as AppSessionStore;
}

class ExpressApp implements IApp {
  private readonly app: express.Express;

  constructor(
    private readonly authController: IAuthController,
    private readonly archiveController: IArchiveController,
    private readonly attendeeController: IAttendeeController,
    private readonly logger: ILoggingService,
    private readonly rsvpController: IRsvpController | null = null,
    private readonly commentController: ICommentController | null = null,
    private readonly dashboardController: IDashboardController | null = null,
  ) {
    this.app = express();
    this.registerMiddleware();
    this.registerTemplating();
    this.registerRoutes();
  }

  private registerMiddleware(): void {
    this.app.use(express.static(path.join(process.cwd(), "src/static")));
    this.app.use(
      session({
        name: "app.sid",
        secret: process.env.SESSION_SECRET ?? "project-starter-demo-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          sameSite: "lax",
        },
      }),
    );
    this.app.use(Layouts);
    this.app.use(express.urlencoded({ extended: true }));
  }

  private registerTemplating(): void {
    this.app.set("view engine", "ejs");
    this.app.set("views", path.join(process.cwd(), "src/views"));
    this.app.set("layout", "layouts/base");
  }

  private isHtmxRequest(req: Request): boolean {
    return req.get("HX-Request") === "true";
  }

  private getParam(value: string | string[] | undefined): string {
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }

  private requireAuthenticated(req: Request, res: Response): boolean {
    const store = sessionStore(req);
    touchAppSession(store);

    if (getAuthenticatedUser(store)) {
      return true;
    }

    this.logger.warn("Blocked unauthenticated request to a protected route");
    if (this.isHtmxRequest(req) || req.method !== "GET") {
      res.status(401).render("partials/error", {
        message: AuthenticationRequired("Please log in to continue.").message,
        layout: false,
      });
      return false;
    }

    res.redirect("/login");
    return false;
  }

  private requireRole(
    req: Request,
    res: Response,
    allowedRoles: UserRole[],
    message: string,
  ): boolean {
    if (!this.requireAuthenticated(req, res)) {
      return false;
    }

    const currentUser = getAuthenticatedUser(sessionStore(req));
    if (currentUser && allowedRoles.includes(currentUser.role)) {
      return true;
    }

    this.logger.warn(
      `Blocked unauthorized request for role ${currentUser?.role ?? "unknown"}`,
    );
    res.status(403).render("partials/error", {
      message: AuthorizationRequired(message).message,
      layout: false,
    });
    return false;
  }

  private registerRoutes(): void {
    // ── Public routes ────────────────────────────────────────────────

    this.app.get(
      "/",
      asyncHandler(async (req, res) => {
        this.logger.info("GET /");
        const store = sessionStore(req);
        res.redirect(isAuthenticatedSession(store) ? "/home" : "/login");
      }),
    );

    this.app.get(
      "/login",
      asyncHandler(async (req, res) => {
        const store = sessionStore(req);
        const browserSession = recordPageView(store);

        if (getAuthenticatedUser(store)) {
          res.redirect("/home");
          return;
        }

        await this.authController.showLogin(res, browserSession);
      }),
    );

    this.app.post(
      "/login",
      asyncHandler(async (req, res) => {
        const email = typeof req.body.email === "string" ? req.body.email : "";
        const password = typeof req.body.password === "string" ? req.body.password : "";
        await this.authController.loginFromForm(res, email, password, sessionStore(req));
      }),
    );

    this.app.post(
      "/logout",
      asyncHandler(async (req, res) => {
        await this.authController.logoutFromForm(res, sessionStore(req));
      }),
    );

    // ── Admin routes ─────────────────────────────────────────────────

    this.app.get(
      "/admin/users",
      asyncHandler(async (req, res) => {
        if (!this.requireRole(req, res, ["admin"], "Only Admin can manage users.")) {
          return;
        }

        const browserSession = recordPageView(sessionStore(req));
        await this.authController.showAdminUsers(res, browserSession);
      }),
    );

    this.app.post(
      "/admin/users",
      asyncHandler(async (req, res) => {
        if (!this.requireRole(req, res, ["admin"], "Only Admin can manage users.")) {
          return;
        }

        const roleValue = typeof req.body.role === "string" ? req.body.role : "user";
        const role: UserRole =
          roleValue === "admin" || roleValue === "staff" || roleValue === "user"
            ? roleValue
            : "user";

        await this.authController.createUserFromForm(
          res,
          {
            email: typeof req.body.email === "string" ? req.body.email : "",
            displayName:
              typeof req.body.displayName === "string" ? req.body.displayName : "",
            password: typeof req.body.password === "string" ? req.body.password : "",
            role,
          },
          touchAppSession(sessionStore(req)),
        );
      }),
    );

    this.app.post(
      "/admin/users/:id/delete",
      asyncHandler(async (req, res) => {
        if (!this.requireRole(req, res, ["admin"], "Only Admin can manage users.")) {
          return;
        }

        const session = touchAppSession(sessionStore(req));
        const currentUser = getAuthenticatedUser(sessionStore(req));
        if (!currentUser) {
          res.status(401).render("partials/error", {
            message: AuthenticationRequired("Please log in to continue.").message,
            layout: false,
          });
          return;
        }

        await this.authController.deleteUserFromForm(
          res,
          typeof req.params.id === "string" ? req.params.id : "",
          currentUser.userId,
          session,
        );
      }),
    );

    // ── Authenticated home page ──────────────────────────────────────
    // TODO: Replace this placeholder with your project's main page.

    this.app.get(
      "/home",
      asyncHandler(async (req, res) => {
        if (!this.requireAuthenticated(req, res)) {
          return;
        }

        const browserSession = recordPageView(sessionStore(req));
        this.logger.info(`GET /home for ${browserSession.browserLabel}`);
        res.render("home", { session: browserSession, pageError: null, dashboard: null });
      }),
    );

    // list all events (authenticated users)
    this.app.get(
      "/events",
      asyncHandler(async (req, res) => {
        if(!this.requireAuthenticated(req, res)) return; // make sure user is logged in

        const store = sessionStore(req); // get session store from request
        const browserSession = recordPageView(store); // record page view for session tracking
        const user = getAuthenticatedUser(store); // get current authenticated user

        if (!this.rsvpController) {
          res.status(500).send("RSVP controller unavailable");
          return;
        }

        await this.rsvpController.showEvents(res, browserSession, user?.userId); // get and return events
      }),
    );

    // HIGHLIGHT
    // Show create event form (admin/staff only)
    this.app.get(
      "/events/new",
      asyncHandler(async (req, res) => {
        if (!this.requireRole(req, res, ["admin", "staff"], "Only staff or admin can create events")) {
          return;
        }
        const store = sessionStore(req);
        const browserSession = recordPageView(store);
        res.render("events/new", { session: browserSession, error: null });
      })
    );

    // HIGHLIGHT
    // Show single event detail with rsvp button
    this.app.get(
      "/events/:eventId",
      asyncHandler(async (req, res) => {
        if(!this.requireAuthenticated(req, res)) return; // make sure user is logged in

        const store = sessionStore(req); // get session store from request
        const browserSession = recordPageView(store); // record page view for session tracking (increments counter, updates last activity)
        const user = getAuthenticatedUser(store); // get current authenticated user
        const eventId = this.getParam(req.params.eventId); // get eventId from URL
 
        if (!this.rsvpController) {
          res.status(500).send("RSVP controller unavailable");
          return;
        }

        await this.rsvpController.showEvent(res, eventId, browserSession, user?.userId); // get and return event details
      }),
    );

    // create new event (admin or staff only)
    this.app.post(
      "/events",
      asyncHandler(async (req, res) => {
        if (!this.requireRole(req, res, ["admin", "staff"], "Only staff or admin can create events.")) 
        {
          return; // make sure user has required role
        }

        const title = typeof req.body.title === "string" ? req.body.title.trim() : ""; // validate and trim title
        const capacity = req.body.capacity ? parseInt(req.body.capacity, 10) : undefined; // get capacity if provided

        const store = sessionStore(req); // get session store
        const browserSession = touchAppSession(store); // update session activity

        // get user from session
        const user = getAuthenticatedUser(store);

        if(!user)
        {
          res.status(401).send("Unauthorized");
          return;
        }

        if (!this.rsvpController) {
          res.status(500).send("RSVP controller unavailable");
          return;
        }

        await this.rsvpController.createEvent(
          res,
          title,
          capacity,
          browserSession,
          user.userId,
          { email: user.email, displayName: user.displayName, role: user.role },
        ); // create event
      }),
    );

    // show event edit form (organizer owner or admin)
    this.app.get(
      "/events/:eventId/edit",
      asyncHandler(async (req, res) => {
        if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers or admins can edit events.")) {
          return;
        }

        const store = sessionStore(req);
        const browserSession = recordPageView(store);
        const user = getAuthenticatedUser(store);
        if (!user) {
          res.status(401).send("Unauthorized");
          return;
        }

        const eventId = this.getParam(req.params.eventId);
        if (!this.rsvpController) {
          res.status(500).send("RSVP controller unavailable");
          return;
        }
        await this.rsvpController.showEditEventForm(res, eventId, browserSession, user.userId, user.role);
      }),
    );

    // update event (organizer owner or admin)
    this.app.post(
      "/events/:eventId/edit",
      asyncHandler(async (req, res) => {
        if (!this.requireRole(req, res, ["admin", "staff"], "Only organizers or admins can edit events.")) {
          return;
        }

        const store = sessionStore(req);
        const browserSession = touchAppSession(store);
        const user = getAuthenticatedUser(store);
        if (!user) {
          res.status(401).send("Unauthorized");
          return;
        }

        const eventId = this.getParam(req.params.eventId);
        const rawCapacity = typeof req.body.capacity === "string" ? req.body.capacity.trim() : "";
        const capacity = rawCapacity === "" ? undefined : Number.parseInt(rawCapacity, 10);
        const status = req.body.status === "cancelled" ? "cancelled" : "active";
        const title = typeof req.body.title === "string" ? req.body.title : "";
        const dateInput = typeof req.body.date === "string" ? req.body.date : "";
        const parsedDate = dateInput ? new Date(dateInput) : null;
        const date = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : "";

        if (!this.rsvpController) {
          res.status(500).send("RSVP controller unavailable");
          return;
        }

        await this.rsvpController.updateEvent(
          res,
          eventId,
          browserSession,
          user.userId,
          user.role,
          { title, capacity, date, status },
        );
      }),
    );

    this.app.get(
      "/events/:eventId/rsvp/partial",
      asyncHandler(async (req, res) => {
        if(!this.requireAuthenticated(req, res)) return;

        const store = sessionStore(req);
        const user = getAuthenticatedUser(store);

        if(!user) 
        {
          res.status(401).send("Unauthorized");
          return;
        }
        
        const eventId = this.getParam(req.params.eventId);
        if (!this.rsvpController) {
          res.status(500).send("RSVP controller unavailable");
          return;
        }
        await this.rsvpController.getRsvpButtonPartial(res, eventId, user.userId);
      })
    );


    // toggle rsvp 
    this.app.post(
      "/events/:eventId/rsvp",
      asyncHandler(async (req, res) => {
        if (!this.requireAuthenticated(req, res)) return; // make sure user is logged in

        const store = sessionStore(req); // get session store
        const user = getAuthenticatedUser(store); // get authenticated user

        if(!user) 
        {
          res.status(401).send("Unauthorized");
          return;
        }

        const eventId = this.getParam(req.params.eventId);
        if (!this.rsvpController) {
          res.status(500).send("RSVP controller unavailable");
          return;
        }
        await this.rsvpController.toggleRSVP(
          res,
          eventId,
          user.userId,
          touchAppSession(store),
        );
      }),
    );
    //get the waitlist position for current user 
    this.app.get("/events/:eventId/waitlist/position", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;

      const store = sessionStore(req);
      const user = getAuthenticatedUser(store);

      if(!user)
      {res.status(401).send("Unauthorized"); 
        return;}
      const eventId = this.getParam(req.params.eventId);
      await this.rsvpController?.getUserRsvpStatus(res, eventId, user.userId);
    }));

    this.app.post("/admin/users/:id/delete", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin"], "Only Admin can manage users.")) return;
      const session = touchAppSession(sessionStore(req));
      const currentUser = getAuthenticatedUser(sessionStore(req));
      if (!currentUser) {
        res.status(401).render("partials/error", {
          message: AuthenticationRequired("Please log in to continue.").message,
          layout: false,
        });
        return;
      }
      await this.authController.deleteUserFromForm(
        res,
        typeof req.params.id === "string" ? req.params.id : "",
        currentUser.userId,
        session,
      );
    }));

    // ── Home ──────────────────────────────────────────────────────────

    this.app.get("/home", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      const browserSession = recordPageView(sessionStore(req));
      this.logger.info(`GET /home for ${browserSession.browserLabel}`);
      res.render("home", { session: browserSession, pageError: null, dashboard: null });
    }));

    // ── Dashboard ─────────────────────────────────────────────────────

    this.app.get("/dashboard", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only staff or admin can view the dashboard.")) return;
      const browserSession = recordPageView(sessionStore(req));
      if (this.dashboardController) {
        await this.dashboardController.showDashboard(res, browserSession);
      }
    }));

    // publish event (admin or staff only)
    this.app.post("/dashboard/events/:id/publish", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only staff or admin can modify events.")) {
        return;
      }
      const session = touchAppSession(sessionStore(req));
      const eventId = typeof req.params.id === "string" ? req.params.id : "";

      if (this.dashboardController) {
        await this.dashboardController.publishEvent(res, eventId, session);
      }
    }));

    // cancel event (admin or staff only)
    this.app.post("/dashboard/events/:id/cancel", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin", "staff"], "Only staff or admin can modify events.")) {
        return;
      }
      const session = touchAppSession(sessionStore(req));
      const eventId = typeof req.params.id === "string" ? req.params.id : "";
      if (this.dashboardController) {
        await this.dashboardController.cancelEvent(res, eventId, session);
      }
    }));
    
    // ── Search ────────────────────────────────────────────────────────

    this.app.get("/events/search", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await EventSearchController.handleSearch(req, res);
    }));

    // ── Comments ──────────────────────────────────────────────────────

    this.app.get("/events/:eventId/comments/partial", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      const store = sessionStore(req);
      const user = getAuthenticatedUser(store);
      const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";
      const browserSession = touchAppSession(store);
      if (this.commentController) {
        await this.commentController.renderCommentsPartial(
          res, eventId, user?.userId, undefined, browserSession
        );
      }
    }));

    this.app.post("/events/:eventId/comments", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      const store = sessionStore(req);
      const user = getAuthenticatedUser(store);
      if (!user) { res.status(401).send("Unauthorized"); return; }
      const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";
      const content = typeof req.body.content === "string" ? req.body.content : "";
      const browserSession = touchAppSession(store);
      if (this.commentController) {
        await this.commentController.postComment(
          res, eventId, user.userId, user.displayName, content, browserSession, null
        );
      }
    }));

    this.app.delete("/events/:eventId/comments/:commentId", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      const store = sessionStore(req);
      const user = getAuthenticatedUser(store);
      if (!user) { res.status(401).send("Unauthorized"); return; }
      const eventId = typeof req.params.eventId === "string" ? req.params.eventId : "";
      const commentId = typeof req.params.commentId === "string" ? req.params.commentId : "";
      if (!eventId || !commentId) { res.status(400).send("Invalid IDs"); return; }
      const browserSession = touchAppSession(store);
      if (this.commentController) {
        await this.commentController.deleteComment(
          res, commentId, eventId, user.userId, user.role, null, browserSession
        );
      }
    }));

    // ── Feature 11: Past Event Archive ───────────────────────────────

    this.app.get("/archive", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.archiveController.getArchive(req, res);
    }));

    // ── Feature 12: Attendee List ─────────────────────────────────────

    this.app.get("/events/:eventId/attendees", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await this.attendeeController.getAttendees(req, res);
    }));

    // ── Saved Events ──────────────────────────────────────────────────

    this.app.post("/events/:eventId/save", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await SavedEventController.toggleSave(req, res);
    }));

    this.app.get("/my-saved-events", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      await SavedEventController.showSavedList(req, res);
    }));

    // ── Error handler ─────────────────────────────────────────────────

    this.app.use((err: unknown, _req: Request, res: Response, _next: (value?: unknown) => void) => {
      const message = err instanceof Error ? err.message : "Unexpected server error.";
      this.logger.error(message);
      res.status(500).render("partials/error", {
        message: "Unexpected server error.",
        layout: false,
      });
    });
  }

  getExpressApp(): express.Express {
    return this.app;
  }
}

export function CreateApp(
  authController: IAuthController,
  archiveController: IArchiveController,
  attendeeController: IAttendeeController,
  logger: ILoggingService,
  rsvpController: IRsvpController | null = null,
  commentController: ICommentController | null = null,
  dashboardController: IDashboardController | null = null,
): IApp {
  return new ExpressApp(
    authController,
    archiveController,
    attendeeController,
    logger,
    rsvpController,
    commentController,
    dashboardController,
  );
}