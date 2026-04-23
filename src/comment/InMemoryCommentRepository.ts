import { randomUUID } from "node:crypto";
import { Err, Ok, type Result } from "../lib/result";
import type { Comment } from "./Comment";
import type { CommentRepository } from "./CommentRepository";

class InMemoryCommentRepository implements CommentRepository {
    private comments: Comment[] = [];

    async createComment(comment: Omit<Comment, "id">): Promise<Result<Comment, Error>> {
        try {
            const newComment: Comment = {
                ...comment,
                id: randomUUID(),
            };

            this.comments.push(newComment);
            return Ok(newComment);
        } 
        catch 
        {
            return Err(new Error("Unable to create comment"));
        }
    }

    async getCommentsByEvent(eventId: string): Promise<Result<Comment[], Error>> {
        try {
            const eventComments = this.comments
                .filter(c => c.eventId === eventId)
                .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
            return Ok(eventComments);
        } 
        catch 
        {
            return Err(new Error("Unable to fetch comments"));
        }
    }

    async deleteComment(commentId: string): Promise<Result<boolean, Error>> {
        try {
            const index = this.comments.findIndex(c => c.id === commentId);
            if (index === -1) return Ok(false);
            this.comments.splice(index, 1);
            return Ok(true);

        } 
        catch 
        {
            return Err(new Error("Unable to delete comment"));
        }
    }

    async findCommentById(commentId: string): Promise<Result<Comment | null, Error>> {
        try {
            const comment = this.comments.find(c => c.id === commentId) ?? null;
            return Ok(comment);

        } 
        catch 
        {
            return Err(new Error("Unable to find comment"));
        }
    }
}

export function createInMemoryCommentRepository(): CommentRepository {
    return new InMemoryCommentRepository();
}
