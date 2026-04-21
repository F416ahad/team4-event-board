import * as eventService from '../service/eventService.js';

export const listEvents = async (req, res) => {
    const filters = { category: req.query.category || 'all' };
    const result = await eventService.getFilteredEvents(filters);
    res.render('events/index', { events: result.value || [], filters });
};

export const showEvent = async (req, res) => {
    const result = await eventService.getEventById(req.params.id);
    if (result.ok) {
        res.render('events/details', { event: result.value });
    } else {
        res.status(404).render('partials/error', { message: "Event not found", layout: false });
    }
};