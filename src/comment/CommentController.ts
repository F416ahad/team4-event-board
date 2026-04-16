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

