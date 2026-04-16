import { Ok, Err, type Result } from "../lib/result";
import type { CommentRepository } from "./CommentRepository";
import type { Comment, CommentWithPermissions } from "./Comment";
import type { Event } from "../rsvp/Rsvp.ts";

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

        if(!eventResult.ok) return Err(eventResult.value);

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

}