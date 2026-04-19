import type { Response } from "express";
import type { CommentService } from "./CommentService";
import type { ILoggingService } from "../service/LoggingService";
import type { IAppBrowserSession } from "../session/AppSession";

// import custom error types 
import {
  CommentEmptyError,
  CommentTooLongError,
  UnauthorizedDeleteError,
  CommentNotFoundError,
  CommentAlreadyDeletedError
} from "./errors";
export interface ICommentController {
    postComment(
        res: Response,
        eventId: string,
        userId: string,
        displayName: string,
        content: string,
        session: IAppBrowserSession,
        eventOwnerId: string | null,
    ): Promise<void>;

    deleteComment(
        res: Response,
        commentId: string,
        eventId: string,
        currentUserId: string | undefined,
        currentUserRole: string | undefined,
        eventOwnerId: string | null,
        session: IAppBrowserSession,
    ): Promise<void>;

    renderCommentsPartial(
        res: Response,
        eventId: string,
        currentUserId: string | undefined,
        eventOwnerId: string | undefined,
        session: IAppBrowserSession
    ): Promise<void>;
}

class CommentController implements ICommentController {
    constructor(
        private readonly service: CommentService,
        private readonly logger: ILoggingService,
    ) {}

    async postComment(
        res: Response,
        eventId: string,
        userId: string,
        displayName: string,
        content: string,
        session: IAppBrowserSession,
        eventOwnerId: string | null,
    ): Promise<void> {

        const result = await this.service.postComment(eventId, userId, displayName, content);

        if(!result.ok) 
        {
            const error = result.value as Error;

            // map specific errors to correct status codes 
            let status = 500; // default for unexpected errors

            if(error instanceof CommentEmptyError) status = 400; // bad request - empty content
            else if(error instanceof CommentTooLongError) status = 400; // bad request - too long
            else if(error instanceof UnauthorizedDeleteError) status = 403; // forbidden (unlikely in post, but still handled)
            else if(error instanceof CommentNotFoundError) status = 404; // Not found (parent comment missing?)
            // no else – keep 500 for any unknown error type
            
            this.logger.warn(`Comment post failed: ${error.message}`);
            res.status(status).send(`<div class="error">${error.message}</div>`);
            return;
        }

        // Re-render comment list partial
        await this.renderCommentList(res, eventId, userId, eventOwnerId ?? undefined, session);
    }

    async deleteComment(
        res: Response,
        commentId: string,
        eventId: string,
        currentUserId: string | undefined,
        currentUserRole: string | undefined,
        eventOwnerId: string | null,
        session: IAppBrowserSession,
    ): Promise<void> {

        const result = await this.service.deleteComment(commentId, currentUserId, currentUserRole, eventOwnerId ?? undefined);

        if(!result.ok) 
        {
            const error = result.value as Error;
            this.logger.warn(`Comment delete failed: ${error.message}`);
            res.status(403).send(`<div class="error">${error.message}</div>`);
            return;
        }

        await this.renderCommentList(res, eventId, currentUserId, eventOwnerId ?? undefined, session);
    }

    private async renderCommentList(
        res: Response,
        eventId: string,
        currentUserId: string | undefined,
        eventOwnerId: string | undefined,
        session: IAppBrowserSession,
    ): Promise<void> {

        const result = await this.service.getCommentsWithPermissions(eventId, currentUserId, eventOwnerId);
        
        if(!result.ok)
        {
            const error = result.value as Error;
            res.status(500).send(`<div class="error">Unable to load comments: ${error.message}</div>`);
            return;
        }
        
        res.render("partials/comment-list", {
            comments: result.value,
            session,
            eventId,
            currentUserId,
            eventOwnerId,
            layout: false,
        });
    }

    // public method that wraps privated renderCommentList
    async renderCommentsPartial(
        res: Response,
        eventId: string,
        currentUserId: string | undefined,
        eventOwnerId: string | undefined,
        session: IAppBrowserSession
        ): Promise<void> {
        await this.renderCommentList(res, eventId, currentUserId, eventOwnerId, session);
    }
}

export function CreateCommentController(service: CommentService, logger: ILoggingService): ICommentController {
    return new CommentController(service, logger);
}