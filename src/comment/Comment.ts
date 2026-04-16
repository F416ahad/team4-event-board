export interface Comment {
    id: string;
    eventId: string;
    userId: string;
    displayName: string;
    content: string;
    createdAt: Date;
}

export interface CommentWithPermissions extends Comment {
    canDelete: boolean;
}