import * as eventService from '../service/eventService.js';


export const showEventDetail = async (req, res) => {
  const eventId = req.params.id;
  const currentUser = req.session.user; 

  const result = await eventService.getEventDetail(eventId, currentUser);

  if (!result.ok) {
    // check if it's an HTMX request to return a partial error instead of a full page
    if (req.headers['hx-request']) {
      return res.status(404).render('partials/error', { 
        message: result.error.message, 
        layout: false 
      });
    }
    return res.status(404).render('errors/404', { message: result.error.message });
  }

  return res.render('events/detail', { 
    event: result.value,
    user: currentUser 
  });
};


export const handleEditEvent = async (req, res) => {
  const eventId = req.params.id;
  const currentUser = req.session.user; 

  // data from the form
  const updateData = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    category: req.body.category,
    capacity: req.body.capacity,
    status: req.body.status,
    startDatetime: req.body.startDatetime,
    endDatetime: req.body.endDatetime
  };

  const result = await eventService.updateEvent(eventId, updateData, currentUser);

  if (!result.ok) {
    // if HTMX request, send partial error
    if (req.headers['hx-request']) {
      return res.status(result.error.status || 400).render('partials/error', { 
        message: result.error.message,
        layout: false 
      });
    }
    
    // error message
    return res.status(400).render('events/edit', { 
      event: { ...updateData, id: eventId }, 
      error: result.error.message 
    });
  }

  // on success, redirect back to the detail page
  res.redirect(`/events/${eventId}`);
};


export const listEvents = async (req, res) => {
  const result = await eventService.getAllEvents(req.query); // Pass filters if needed

  if (req.headers['hx-request']) {
    return res.render('partials/event-list', { 
      events: result.value || [], 
      layout: false 
    });
  }

  return res.render('events/index', { events: result.value || [] });
};
