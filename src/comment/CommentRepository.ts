import type { Result } from "../lib/result";
import type { Comment } from "./Comment";

export interface CommentRepository {
    createComment(comment: Omit<Comment, "id">): Promise<Result<Comment, Error>>;
    getCommentsByEvent(eventId: string): Promise<Result<Comment[], Error>>;
    deleteComment(commentId: string): Promise<Result<boolean, Error>>;
    findCommentById(commentId: string): Promise<Result<Comment | null, Error>>;
}