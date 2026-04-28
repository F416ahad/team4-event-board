export type RSVPStatus = "ATTENDING" | "WAITLISTED" | "CANCELLED";

export interface IRSVPRecord {
  id: string;
  eventId: string;
  memberId: string;
  status: RSVPStatus;
  waitlistPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
}