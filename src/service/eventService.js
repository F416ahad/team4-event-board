import * as eventRepo from '../repositories/InMemoryEventRepository.js';

/**
 * feature 6 Service Logic: Category and Date Filter
 */
export const getFilteredEvents = async (filters = {}) => {
    try {
        const allEvents = await eventRepo.findAll();

        // 1. only published events
        let filtered = allEvents.filter(e => e.status === 'published');

        // 2. filter by Category
        if (filters.category && filters.category !== 'all') {
            filtered = filtered.filter(e => 
                e.category.toLowerCase() === filters.category.toLowerCase()
            );
        }

        // 3. filter by Timeframe
        const now = new Date();
        if (filters.timeframe === 'this-week') {
            const nextWeek = new Date();
            nextWeek.setDate(now.getDate() + 7);
            filtered = filtered.filter(e => new Date(e.startDatetime) <= nextWeek);
            
        } else if (filters.timeframe === 'this-weekend') {
            const sunday = new Date();
            const daysUntilSunday = 7 - sunday.getDay();
            sunday.setDate(now.getDate() + daysUntilSunday);
            sunday.setHours(23, 59, 59, 999);
            filtered = filtered.filter(e => new Date(e.startDatetime) <= sunday);
        }

        return { ok: true, value: filtered };
    } catch (error) {
        return { ok: false, error: 'Service error: ' + error.message };
    }
};