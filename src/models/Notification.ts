import mongoose, { Schema, Document, Types } from "mongoose";

export type NotificationType =
  | "LIKE_POST"
  | "COMMENT_POST"
  | "REPLY_COMMENT"
  | "FOLLOW"
  | "BOOKMARK_POST"
  | "MENTION";

export interface INotification extends Document {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  type: NotificationType;
  post?: Types.ObjectId;
  comment?: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["LIKE_POST", "COMMENT_POST", "REPLY_COMMENT", "FOLLOW", "BOOKMARK_POST", "MENTION"],
      required: true,
    },
    post: { type: Schema.Types.ObjectId, ref: "Post" },
    comment: { type: Schema.Types.ObjectId, ref: "Comment" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fast recipient-scoped queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
