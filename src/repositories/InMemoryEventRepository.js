const events = new Map();

// Seed data
events.set("1", {
  id: "1",
  title: "Database Normalization Workshop",
  description: "Learn BCNF and query optimization.",
  location: "ILC",
  category: "Academic",
  status: "published",
  startDatetime: new Date("2026-04-18T10:00:00"),
});

events.set("2", {
  id: "2",
  title: "Spring Semester Kickoff",
  description: "Pizza and networking.",
  location: "Campus Center",
  category: "Social",
  status: "published",
  startDatetime: new Date("2026-04-20T18:00:00"),
});

export const findEventById = async (id) => {
  const event = events.get(id);
  return event ? { ...event } : null;
};

export const findAll = async () => {
  return Array.from(events.values());
};