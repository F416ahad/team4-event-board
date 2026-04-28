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

