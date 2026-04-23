import * as eventService from '../service/eventService.js';

export const showEventDetail = async (req, res) => {
  // 1. parse the request
  const eventId = req.params.id;
  const currentUser = req.session.user; // Provided by your auth middleware

  // 2. call service
  const result = await eventService.getEventDetail(eventId, currentUser);

  // 3. map Result to an HTTP response
  if (!result.ok) {
    // if service returns an error treat it as a 404 
    return res.status(404).render('errors/404', { 
      message: result.error 
    });
  }

  // 4. success renders the page w/ data
  return res.render('events/detail', { 
    event: result.value,
    user: currentUser 
  });
};

if (req.headers['hx-request']) {
    return res.render('partials/event-list', { 
        events: result.value || [], 
        layout: false 
    });
}
