import type { AppSessionStore } from "../session/AppSession";

declare global {
  namespace Express {
    interface Request {
      session: AppSessionStore;
    }
  }
}