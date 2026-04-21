import { Request, Response, NextFunction } from 'express';
import { AppSessionStore } from '../../src/session/AppSession';

// a fake session store that pretends a user is logged in
export function createTestSession(userId: string, role: string = 'user'): AppSessionStore {
  // use double cast (as any as AppSessionStore) to bypass missing Express Session properties
  return {
    authenticatedUser: {
      userId,
      displayName: 'Test User',
      email: 'test@example.com',
      role: role as any,
    },
    pageViews: 1,
    lastActivity: new Date(),
    browserLabel: 'TestBrowser',
  } as any as AppSessionStore; // Fix: cast to any first, then to AppSessionStore
}

// middleware to inject test session into request
export function mockAuthMiddleware(userId: string, role: string = 'user') {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).session = createTestSession(userId, role);
    next();
  };
}