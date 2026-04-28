import { PrismaClient } from "@prisma/client";
import { Ok, Err, type Result } from "../lib/result";
import type { CommentRepository } from "./CommentRepository";
import type { Comment } from "./Comment";

export function createPrismaCommentRepository(prisma: PrismaClient): CommentRepository {
  return new PrismaCommentRepository(prisma);
}

function toComment(row: {
  id: string;
  eventId: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: Date;
}): Comment {
  return {
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    displayName: row.displayName,
    content: row.content,
    createdAt: row.createdAt,
  };
}

class PrismaCommentRepository implements CommentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createComment(comment: Omit<Comment, "id">): Promise<Result<Comment, Error>> {
    try {
      await this.prisma.user.upsert({
        where: { id: comment.userId },
        update: { displayName: comment.displayName },
        create: {
          id: comment.userId,
          email: `${comment.userId}@session.local`,
          displayName: comment.displayName,
          role: "user",
          passwordHash: "session-auth-user",
        },
      });

      const row = await this.prisma.comment.create({
        data: {
          eventId: comment.eventId,
          userId: comment.userId,
          displayName: comment.displayName,
          content: comment.content,
          createdAt: comment.createdAt,
        },
      });
      return Ok(toComment(row));
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async getCommentsByEvent(eventId: string): Promise<Result<Comment[], Error>> {
    try {
      const rows = await this.prisma.comment.findMany({
        where: { eventId },
        orderBy: { createdAt: "asc" },
      });
      return Ok(rows.map(toComment));
    } catch (e) {
      return Err(e instanceof Error ? e : new Error(String(e)));
    }
  }

 