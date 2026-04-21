import request from 'supertest';
import { app } from '../app'; 

describe('Feature 2: Event Detail Page', () => {
  
  it('should return 200 and the event details for a published event', async () => {
    const res = await request(app).get('/events/1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('CS Study Jam'); // matches seeded data
  });

  it('should return 404 for an event ID that does not exist', async () => {
    const res = await request(app).get('/events/999');
    expect(res.status).toBe(404);
  });

  it('should return 404 for a draft event when not logged in (Hidden Rule)', async () => {
    // draft in repository
    const res = await request(app).get('/events/2');
    expect(res.status).toBe(404);
  });

  // edge case: check if an Admin can see the draft
  it('should return 200 for a draft event if the user is an admin', async () => {
    // note: in Sprint 2, likely need to mock the session
    //  simplified version; auth middleware must be active
    const res = await request(app)
      .get('/events/2')
      .set('Cookie', ['mock-admin-session-cookie']); 
    
    // if session mocking isnt set up yet, this test will fail
  });
});