import type { Response } from "express";
import type { CommentService } from "./CommentService";
import type { ILoggingService } from "../service/LoggingService";
import type { IAppBrowserSession } from "../session/AppSession";

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
            this.logger.warn(`Comment post failed: ${result.value.message}`);
            res.status(400).send(`<div class="error">${result.value.message}</div>`);
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
            this.logger.warn(`Comment delete failed: ${result.value.message}`);
            res.status(403).send(`<div class="error">${result.value.message}</div>`);
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
            res.status(500).send('<div class="error">Unable to load comments</div>');
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
}

