// create new map
const events = new Map();

// seed data to test the detail page in the browser
events.set("1", {
  id: "1",
  title: "First Test Event",
  description: "This is a description of the event.",
  location: "ILC",
  category: "Social",
  status: "published", // change to 'draft' to test service rules later
  capacity: 50,
  startDatetime: new Date("2026-05-01T10:00:00"),
  endDatetime: new Date("2026-05-01T12:00:00"),
  organizerId: "user-123", // make sure this matches a user ID in the app
  createdAt: new Date(),
  updatedAt: new Date()
});

/**
 * finds an event by its unique ID
 */
export const findEventById = async (id) => {
  const event = events.get(id);
  return event ? { ...event } : null;
};

/**
 * In-Memory Event Repository
 * Contains sample data for testing Category and Date filters.
 */
const events = [
    { 
        id: 1, 
        title: 'Database Normalization Workshop', 
        category: 'Academic', 
        status: 'published', 
        startDatetime: '2026-04-18T10:00:00' 
    },
    { 
        id: 2, 
        title: 'Spring Semester Kickoff', 
        category: 'Social', 
        status: 'published', 
        startDatetime: '2026-04-20T18:00:00' 
    },
    { 
        id: 3, 
        title: 'Private Faculty Meeting', 
        category: 'Academic', 
        status: 'draft', 
        startDatetime: '2026-04-19T09:00:00' 
    }
];

export const findAll = async () => {
    // Return a copy to ensure the in-memory "database" isn't accidentally 
    // modified outside this file
    return [...events];
};