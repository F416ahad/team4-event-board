import * as eventService from '../service/eventService.js';

export const listEvents = async (req, res) => {
    // parse filters from the URL query string
    const filters = {
        category: req.query.category || 'all',
        timeframe: req.query.timeframe || 'all-upcoming'
    };

    // call the service layer
    const result = await eventService.getFilteredEvents(filters);

    // handle result pattern
    if (result.ok) {
        // render the index view with the filtered list and current filter state
        res.render('events/index', { 
            events: result.value, 
            filters: filters 
        });
    } else {
        res.status(500).render('partials/error', { 
            message: result.error, 
            layout: false 
        });
    }
};