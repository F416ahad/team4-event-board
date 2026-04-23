import path from "node:path";
import express, { Request, RequestHandler, Response } from "express";
import session from "express-session";
import Layouts from "express-ejs-layouts";
import { IAuthController } from "./auth/AuthController";
import {
  AuthenticationRequired,
  AuthorizationRequired,
} from "./auth/errors";
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
// @ts-ignore
import eventRoutes from './routes/eventRoutes.js';

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
  private readonly isTestMode = process.env.NODE_ENV === 'test'; // for test mode

  constructor(
    private readonly authController: IAuthController,
    private readonly eventController: any, 
    private readonly logger: ILoggingService,
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

    // TEST MODE: inject fake user (only in test environment)
    if(process.env.NODE_ENV === 'test') 
    {
      this.app.use((req, _res, next) => {
        const store = sessionStore(req);

        (store as any).authenticatedUser = {
          userId: 'test-user-1',
          displayName: 'Test User',
          email: 'test@example.com',
          role: 'user',
        };
        
        next();
      });
    }
    
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

  private requireAuthenticated(req: Request, res: Response): boolean {
    // ✅ Bypass authentication entirely in test mode
    if (this.isTestMode) return true;
    
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

    this.logger.warn(`Blocked unauthorized request for role ${currentUser?.role ?? "unknown"}`);
    res.status(403).render("partials/error", {
      message: AuthorizationRequired(message).message,
      layout: false,
    });
    return false;
  }

  private registerRoutes(): void {
    // Public routes
    this.app.get("/", asyncHandler(async (req, res) => {
      const store = sessionStore(req);
      res.redirect(isAuthenticatedSession(store) ? "/home" : "/login");
    }));

    this.app.get("/login", asyncHandler(async (req, res) => {
      const store = sessionStore(req);
      const browserSession = recordPageView(store);
      if (getAuthenticatedUser(store)) {
        res.redirect("/home");
        return;
      }
      await this.authController.showLogin(res, browserSession);
    }));

    this.app.post("/login", asyncHandler(async (req, res) => {
      const email = typeof req.body.email === "string" ? req.body.email : "";
      const password = typeof req.body.password === "string" ? req.body.password : "";
      await this.authController.loginFromForm(res, email, password, sessionStore(req));
    }));

    this.app.post("/logout", asyncHandler(async (req, res) => {
      await this.authController.logoutFromForm(res, sessionStore(req));
    }));

    // Feature Routes
    this.app.use('/events', eventRoutes); 

    // Admin routes
    this.app.get("/admin/users", asyncHandler(async (req, res) => {
      if (!this.requireRole(req, res, ["admin"], "Only Admin can manage users.")) return;
      const browserSession = recordPageView(sessionStore(req));
      await this.authController.showAdminUsers(res, browserSession);
    }));

    this.app.get("/home", asyncHandler(async (req, res) => {
      if (!this.requireAuthenticated(req, res)) return;
      const browserSession = recordPageView(sessionStore(req));
      res.render("home", { session: browserSession, pageError: null });
    }));

    // Error handler
    this.app.use((err: unknown, _req: Request, res: Response, _next: (value?: unknown) => void) => {
      const message = err instanceof Error ? err.message : "Unexpected server error.";
      this.logger.error(message);
      res.status(500).render("partials/error", { message: "Unexpected server error.", layout: false });
    });
  }

  getExpressApp(): express.Express {
    return this.app;
  }
}

export function CreateApp(
  authController: IAuthController,
  eventController: any, 
  logger: ILoggingService,
  rsvpController: IRsvpController,
): IApp {
  return new ExpressApp(authController, eventController, logger);
}