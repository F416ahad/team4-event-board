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

}