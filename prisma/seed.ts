import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const now = new Date();
  const past = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  // Create a test user to be the organizer
  const organizer = await prisma.user.upsert({
    where: { email: "organizer@app.test" },
    update: {},
    create: {
      email: "organizer@app.test",
      displayName: "Test Organizer",
      role: "staff",
      passwordHash: "placeholder",
    },
  });

  // Create past events with endTime set
    const event1 = await prisma.event.upsert({
    where: { id: "seed-event-1" },
    update: {},
    create: {
      id: "seed-event-1",
      title: "Opening Keynote",
      status: "past",
      date: past(5),
      endTime: past(4),
      capacity: 200,
      category: "academic",
      createdByUserId: organizer.id,
    },
  });

  const event2 = await prisma.event.upsert({
    where: { id: "seed-event-2" },
    update: {},
    create: {
      id: "seed-event-2",
      title: "Hackathon 2024",
      status: "past",
      date: past(30),
      endTime: past(6),
      capacity: 50,
      category: "tech",
      createdByUserId: organizer.id,
    },
  });

  // Create a member to RSVP
  const member = await prisma.user.upsert({
    where: { email: "member@app.test" },
    update: {},
    create: {
      email: "member@app.test",
      displayName: "Alice Member",
      role: "user",
      passwordHash: "placeholder",
    },
  });

  // Seed RSVPs for event1
  await prisma.rsvp.upsert({
    where: { userId_eventId: { userId: member.id, eventId: event1.id } },
    update: {},
    create: {
      userId: member.id,
      eventId: event1.id,
      status: "going",
    },
  });

  console.log("Seeded successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());