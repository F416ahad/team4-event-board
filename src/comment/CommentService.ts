import { Ok, Err, type Result } from "../lib/result";
import type { CommentRepository } from "./CommentRepository";
import type { Comment, CommentWithPermissions } from "./Comment";
import type { Event } from "../rsvp/rsvp.ts";

export class CommentService {
    constructor(
        private readonly commentRepo: CommentRepository,
        private readonly getEventById: (eventId: string) => Promise<Result<Event | null, Error>>,
    ) {}

    async postComment(
        eventId: string,
        userId: string,
        displayName: string,
        content: string,
    ): Promise<Result<Comment, Error>> {

        if(!content.trim()) {
        
            return Err(new Error("Comment cannot be empty"));
        }
        if(content.length > 500) 
        {
            return Err(new Error("Comment too long (max 500 characters)"));
        }

        // checks to see if event actually exists
        const eventResult = await this.getEventById(eventId);

        if(!eventResult.ok) 
        {
            return Err(eventResult.value as Error);
        }

        if(!eventResult.value) return Err(new Error("Event not found"));

        const commentData = {
            eventId,
            userId,
            displayName,
            content: content.trim(),
            createdAt: new Date(),
        };

        return await this.commentRepo.createComment(commentData);
    }

    async getCommentsWithPermissions(
        eventId: string,
        currentUserId: string | undefined,
        eventOwnerId: string | undefined,
    ): Promise<Result<CommentWithPermissions[], Error>> {

        const result = await this.commentRepo.getCommentsByEvent(eventId);

        if(!result.ok) 
        {
            // result.value is Error because ok === false
            return Err(result.value as Error);
        }

        // creates a new object with the same fields as comment, with the addition of the canDelete field
        const commentsWithPerms = result.value.map(comment => ({
        id: comment.id,
        eventId: comment.eventId,
        userId: comment.userId,
        displayName: comment.displayName,
        content: comment.content,
        createdAt: comment.createdAt,
        canDelete: this.canDeleteComment(comment, currentUserId, eventOwnerId),
        }));
        
        return Ok(commentsWithPerms);
    }

    async deleteComment(
        commentId: string,
        currentUserId: string | undefined,
        currentUserRole: string | undefined,
        eventOwnerId: string | undefined,
    ): Promise<Result<void, Error>> {

        const commentResult = await this.commentRepo.findCommentById(commentId);

        if(!commentResult.ok) 
        {
            // commentResult.value is Error because ok === false
            return Err(commentResult.value as Error);
        }

        const comment = commentResult.value;

        if(!comment) return Err(new Error("Comment not found"));

        const canDelete = this.canDeleteComment(comment, currentUserId, eventOwnerId, currentUserRole);

        if(!canDelete) 
        {
            return Err(new Error("You do not have permission to delete this comment"));
        }

        const deleteResult = await this.commentRepo.deleteComment(commentId);

        if(!deleteResult.ok) 
        {
            // deleteResult.value is Error because ok === false
            return Err(deleteResult.value as Error);
        }

        if(!deleteResult.value) return Err(new Error("Comment already deleted"));

        return Ok(undefined);
    }

    private canDeleteComment(
        comment: Comment,
        currentUserId: string | undefined,
        eventOwnerId: string | undefined,
        currentUserRole: string = "user",
    ): 
    boolean
    {
        if(!currentUserId) return false; // if user not logged in, can't delete
        if(currentUserRole === "admin") return true; // admins can delete any comment
        if(eventOwnerId && currentUserId === eventOwnerId) return true; // event owner can delete comments on their event
        if(comment.userId === currentUserId) return true; // comment author can delete their own comment
        return false; // all other users are not allowed to delete
    }
}