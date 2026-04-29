import * as eventRepo from '../repositories/PrismaEventRepository.js';

/**
 * Feature 6: Get Filtered Events
 * Logic to calculate date ranges for 'this-week' and 'this-weekend'
 */
export const getFilteredEvents = async (queryParams) => {
  const { category, timeframe } = queryParams;
  let startDate = new Date(); // Start from "now"
  let endDate = new Date('2099-12-31'); // Default to far future

  // Timeframe Logic
  if (timeframe === 'this-week') {
    endDate = new Date();
    endDate.setDate(startDate.getDate() + 7);
  } else if (timeframe === 'this-weekend') {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) to 6 (Sat)
    
    // Calculate days until Friday (5)
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    startDate = new Date(today);
    startDate.setDate(today.getDate() + daysUntilFriday);
    startDate.setHours(0, 0, 0, 0); // Start of Friday

    // End of Sunday
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 2); 
    endDate.setHours(23, 59, 59, 999);
  }

  // Pass the calculated dates and category to the Repo layer
  const events = await eventRepo.findFilteredEvents({
    category: category !== 'all' ? category : null,
    startDate,
    endDate
  });

  return { ok: true, value: events };
};