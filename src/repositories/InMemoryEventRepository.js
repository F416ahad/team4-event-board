// create new map
const events = new Map();

// seed data to test the detail page in the browser
events.set("1", {
  id: "1",
  title: "First Test Event",
  description: "This is a detailed description of the event.",
  location: "Campus Center",
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