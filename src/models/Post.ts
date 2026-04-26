import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string; // HTML string from TipTap
  author: Types.ObjectId;
  coverImage?: string;
  tags: string[];
  isPublished: boolean;
  readTime: number;
  views: number;
  likes: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  shares: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    coverImage: { type: String },
    tags: [{ type: String }],
    isPublished: { type: Boolean, default: false },
    readTime: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "User" }],
    shares: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Pre-save hook to calculate read time (approx 200 words per minute)
PostSchema.pre("save", async function () {
  const doc = this as unknown as IPost;
  if (doc.isModified("content")) {
    const textLength = doc.content.replace(/<[^>]*>?/gm, "").split(/\s+/).length;
    doc.readTime = Math.max(1, Math.ceil(textLength / 200));
  }
});

export default mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);
